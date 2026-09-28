"""Local repair of the scan's fused axillae; never changes the source asset.

blender -b --python scripts/prepare-anais-rig.py -- input.glb output.glb
The two narrow, rounded cuts reconstruct the unobserved arm/torso separation.
Coordinates are calibrated to Anais full-hi3d only (Blender Z is glTF Y).
"""
import bpy
import bmesh
import os
import sys
import math

source, output = sys.argv[sys.argv.index('--') + 1:]
if os.path.exists(output) or os.path.realpath(source) == os.path.realpath(output):
    raise RuntimeError('Provide a new output; the source scan is preserved.')
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.abspath(source))
mesh = next(obj for obj in bpy.context.scene.objects if obj.type == 'MESH')
bpy.ops.object.select_all(action='DESELECT')
mesh.select_set(True)
bpy.context.view_layer.objects.active = mesh
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
bm = bmesh.new()
bm.from_mesh(mesh.data)
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=0.000001)
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
bm.to_mesh(mesh.data)
bm.free()
print('WORLD', mesh.matrix_world, mesh.dimensions[:])
for side in [-1, 1]:
    bpy.ops.object.select_all(action='DESELECT')
    # Follow the actual arm/chest valley. A straight sagittal slice would
    # incorrectly attach the lateral breast to the raised arm.
    vertices, faces = [], []
    rings, segments = 65, 48
    for depth in range(rings):
        front = -.16 + depth * .32 / (rings - 1)
        center = .094 + .95 * max(front - .018, 0)
        for k in range(segments):
            theta = 2 * math.pi * k / segments
            vertices.append((side * (center + .005 * math.sin(theta)),
                -front, .14 + .080 * math.cos(theta)))
    for depth in range(rings - 1):
        for k in range(segments):
            a = depth * segments + k
            b = depth * segments + (k + 1) % segments
            faces.append((a, b, b + segments, a + segments))
    faces.extend([tuple(range(segments - 1, -1, -1)),
        tuple((rings - 1) * segments + k for k in range(segments))])
    data = bpy.data.meshes.new('Curved axillary separator')
    data.from_pydata(vertices, [], faces)
    cutter = bpy.data.objects.new('Axilla separation', data)
    bpy.context.collection.objects.link(cutter)
    bm = bmesh.new(); bm.from_mesh(data)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(data); bm.free()
    modifier = mesh.modifiers.new('Reconstruct concealed axilla', 'BOOLEAN')
    modifier.operation = 'DIFFERENCE'
    modifier.solver = 'EXACT'
    modifier.object = cutter
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.data.objects.remove(cutter, do_unlink=True)
# Boolean caps contain long triangles and split normal seams; these are not
# suitable deformation topology. Rebuild a watertight, evenly sampled surface.
bpy.context.view_layer.objects.active = mesh
remesh = mesh.modifiers.new('Uniform deformation surface', 'REMESH')
remesh.mode = 'VOXEL'
remesh.voxel_size = .0018
remesh.use_smooth_shade = True
bpy.ops.object.modifier_apply(modifier=remesh.name)
relax = mesh.modifiers.new('Round reconstructed seams', 'SMOOTH')
relax.factor = .55
relax.iterations = 3
bpy.ops.object.modifier_apply(modifier=relax.name)
for face in mesh.data.polygons:
    face.use_smooth = True
bpy.ops.export_scene.gltf(filepath=os.path.abspath(output), export_format='GLB',
    export_animations=False, export_materials='EXPORT')
print('REPAIRED', len(mesh.data.vertices), len(mesh.data.polygons), output)
