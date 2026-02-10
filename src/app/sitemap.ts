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

  // Main pages
  const mainPages = [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'daily' as const,
      priority: 1,
    },
  ];

  // Location pages (top 20 most important locations)
  const locationPages = uniqueLocations.slice(0, 20).map((location: any) => ({
    url: `${baseUrl}/cctv/${location.slug}`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...mainPages, ...locationPages];
}
