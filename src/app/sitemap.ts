import { MetadataRoute } from 'next';
import cctvs from '@/data/cctvs.json';

const baseUrl = 'https://myroutes.muliaabdi.net';

// Get unique locations from CCTV data
const uniqueLocations = cctvs.reduce((acc: any[], cctv: any) => {
  const locationKey = cctv.name.replace(/KOTA - /, '').split(' - ')[0].trim();
  if (!acc.find((loc: any) => loc.key === locationKey)) {
    acc.push({
      key: locationKey,
      name: cctv.name,
      slug: locationKey.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
    });
  }
  return acc;
}, []);

export default function sitemap(): MetadataRoute.Sitemap {
  const currentDate = new Date();

  // Main homepage
  const mainPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
  ];

  // Dynamic location pages for every unique CCTV spot in Bandung
  const locationPages: MetadataRoute.Sitemap = uniqueLocations.map((location: any) => ({
    url: `${baseUrl}/cctv/${location.slug}`,
    lastModified: currentDate,
    changeFrequency: 'daily',
    priority: 0.9,
  }));

  return [...mainPages, ...locationPages];
}
