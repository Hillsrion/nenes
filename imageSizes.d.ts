declare module "~/imageSizes.json" {
  const value: {
    cursor: {
      size: {
        width: number;
        height: number;
      };
    };
    cover: {
      size: {
        width: string;
        height: string;
      };
    };
    "cover-portrait": {
      size: {
        width: string;
        height: string;
      };
    };
    screening: {
      size: {
        width: number;
        height: number;
      };
      screens: {
        tablet: {
          width: number;
          height: number;
        };
        mobile: {
          width: number;
          height: number;
        };
      };
    };
  };
  export default value;
} 