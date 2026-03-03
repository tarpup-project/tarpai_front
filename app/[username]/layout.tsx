import { Metadata } from 'next';

type Props = {
  params: Promise<{ username: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  
  try {
    // Fetch user data
    const response = await fetch(
      `https://tarpai-back-x753.onrender.com/users?username=${username}`,
      { cache: 'no-store' }
    );
    const users = await response.json();
    const user = users.find((u: any) => u.username === username);
    
    if (!user) {
      return {
        title: 'User Not Found - TarpAI',
        description: 'This user profile could not be found.',
      };
    }

    const title = `${user.displayName || user.name} (@${user.username}) - TarpAI`;
    const description = user.bio || `Check out ${user.displayName || user.name}'s profile on TarpAI`;
    const profileUrl = `https://tarpai.onrender.com/${user.username}`;
    
    // Ensure avatar URL is absolute
    const avatarUrl = user.avatar.startsWith('http') 
      ? user.avatar 
      : `https://tarpai.onrender.com${user.avatar}`;

    return {
      title,
      description,
      openGraph: {
        type: 'profile',
        url: profileUrl,
        title,
        description,
        siteName: 'TarpAI',
        images: [
          {
            url: avatarUrl,
            width: 1200,
            height: 1200,
            alt: `${user.displayName || user.name}'s avatar`,
            type: 'image/png',
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [avatarUrl],
        site: '@tarpai',
      },
      icons: {
        icon: avatarUrl,
        shortcut: avatarUrl,
        apple: avatarUrl,
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'TarpAI Profile',
      description: 'View profile on TarpAI',
    };
  }
}

export default function UsernameLayout({ children }: Props) {
  return <>{children}</>;
}
