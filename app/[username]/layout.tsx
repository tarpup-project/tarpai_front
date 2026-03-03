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

    return {
      title,
      description,
      openGraph: {
        type: 'profile',
        url: profileUrl,
        title,
        description,
        images: [
          {
            url: user.avatar,
            width: 400,
            height: 400,
            alt: `${user.displayName || user.name}'s avatar`,
          },
        ],
      },
      twitter: {
        card: 'summary',
        title,
        description,
        images: [user.avatar],
      },
      icons: {
        icon: user.avatar,
        shortcut: user.avatar,
        apple: user.avatar,
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
