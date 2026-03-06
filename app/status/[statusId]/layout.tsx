import { Metadata } from 'next';

interface StatusLayoutProps {
  children: React.ReactNode;
  params: Promise<{ statusId: string }>;
}

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(props: StatusLayoutProps): Promise<Metadata> {
  const params = await props.params;
  const { statusId } = params;
  
  try {
    console.log('[Metadata] Fetching status:', statusId);
    
    // Fetch status data from the backend with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const apiUrl = `https://tarpai-back-x753.onrender.com/status/${statusId}`;
    console.log('[Metadata] Fetching from:', apiUrl);
    
    const response = await fetch(apiUrl, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Metadata] Failed to fetch status: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Status not found: ${response.status}`);
    }
    
    const status = await response.json();
    console.log('[Metadata] Successfully fetched status:', {
      id: status.id,
      content: status.content?.substring(0, 50),
      hasImages: !!status.images?.length,
      imageUrl: status.images?.[0]?.substring(0, 50),
      authorName: status.author?.name,
    });
    
    // Prepare metadata with safe fallbacks
    const authorName = status.author?.name || 'Tarpai User';
    const title = `${authorName}'s Status on Tarpai`;
    const description = status.content?.trim() || 'Check out this status on Tarpai';
    const image = status.images?.[0] || status.image || status.author?.avatar || 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png';
    const url = `https://tarpai.onrender.com/status/${statusId}`;
    
    console.log('[Metadata] Generated metadata:', { 
      title, 
      description: description.substring(0, 100),
      image: image.substring(0, 100),
    });
    
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url,
        siteName: 'Tarpai',
        images: [
          {
            url: image,
            width: 1200,
            height: 630,
            alt: `Status by ${authorName}`,
          },
        ],
        type: 'article',
        publishedTime: status.createdAt,
        authors: [authorName],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [image],
        creator: status.author?.username ? `@${status.author.username}` : undefined,
      },
      other: {
        'og:image:width': '1200',
        'og:image:height': '630',
      },
    };
  } catch (error: any) {
    console.error('[Metadata] Failed to fetch status metadata:', error.message || error);
    
    // Fallback metadata
    return {
      title: 'Status on Tarpai',
      description: 'Check out this status on Tarpai',
      openGraph: {
        title: 'Status on Tarpai',
        description: 'Check out this status on Tarpai',
        url: `https://tarpai.onrender.com/status/${statusId}`,
        siteName: 'Tarpai',
        images: [
          {
            url: 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png',
            width: 1200,
            height: 630,
          },
        ],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Status on Tarpai',
        description: 'Check out this status on Tarpai',
      },
    };
  }
}

export default async function StatusLayout(props: StatusLayoutProps) {
  return <>{props.children}</>;
}
