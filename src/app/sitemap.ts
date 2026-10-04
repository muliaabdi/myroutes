import { MetadataRoute } from 'next';
import cctvs from '@/data/cctvs.json';

const baseUrl = 'https://myroutes.muliaabdi.net';

// Get unique locations from CCTV data
const uniqueLocations = cctvs.reduce((acc: any[], cctv: any) => {
  const locationKey = cctv.name.replace(/KOTA - /, '').split(' - ')[0].trim();
  const slug = locationKey.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
  if (!acc.find((loc: any) => loc.slug === slug)) {
    acc.push({
      key: locationKey,
      name: cctv.name,
      slug,
    });
  }
  return acc;
}, []);

export default function sitemap(): MetadataRoute.Sitemap {
  // Stable modification date for reliable indexing
  const lastModified = new Date('2026-10-01');

  // Main homepage and directory
  const mainPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/cctv`,
      lastModified,
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ];

  // Dynamic location pages for every unique CCTV spot in Bandung
  const locationPages: MetadataRoute.Sitemap = uniqueLocations.map((location: any) => ({
    url: `${baseUrl}/cctv/${location.slug}`,
    lastModified,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [...mainPages, ...locationPages];
}
