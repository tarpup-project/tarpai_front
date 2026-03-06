import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ statusId: string }> }
) {
  const { statusId } = await params;
  
  try {
    const response = await fetch(`https://tarpai-back-x753.onrender.com/status/${statusId}`, {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      throw new Error('Status not found');
    }
    
    const status = await response.json();
    
    return NextResponse.json({
      title: `${status.author?.name || 'User'}'s Status on Tarpai`,
      description: status.content || 'Check out this status on Tarpai',
      image: status.images?.[0] || status.image || status.author?.avatar,
      author: status.author?.name,
      username: status.author?.username,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch status' },
      { status: 500 }
    );
  }
}
