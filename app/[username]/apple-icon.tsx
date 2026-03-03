import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const size = {
  width: 180,
  height: 180,
};

export const contentType = 'image/png';

export default async function AppleIcon({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  
  try {
    // Fetch user data
    const response = await fetch(
      `https://tarpai-back-x753.onrender.com/users?username=${username}`,
      { cache: 'no-store' }
    );
    const users = await response.json();
    const user = users.find((u: any) => u.username === username);
    
    if (!user || !user.avatar) {
      // Return default icon if user not found
      return new ImageResponse(
        (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#1a1a1a',
              color: 'white',
              fontSize: 80,
              fontWeight: 'bold',
            }}
          >
            T
          </div>
        ),
        {
          ...size,
        }
      );
    }

    // Return user's avatar as icon
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={user.avatar}
            alt={user.displayName || user.name}
            width="180"
            height="180"
            style={{
              borderRadius: '50%',
            }}
          />
        </div>
      ),
      {
        ...size,
      }
    );
  } catch (error) {
    // Return default icon on error
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#1a1a1a',
            color: 'white',
            fontSize: 80,
            fontWeight: 'bold',
          }}
        >
          T
        </div>
      ),
      {
        ...size,
      }
    );
  }
}
