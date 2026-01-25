declare module "*.json" {
  const value: Array<{
    id: string;
    cctv_name: string;
    lat: string;
    lng: string;
    stream_cctv: string;
  }>;
  export default value;
}
