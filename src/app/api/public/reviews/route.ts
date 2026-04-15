import { NextResponse } from 'next/server';
import { getPublicReviews } from '@/services/review.service';

export async function GET() {
  try {
    const data = await getPublicReviews();
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Public reviews error:', error);
    return NextResponse.json(
      { error: 'Gagal memuat ulasan' },
      { status: 500 }
    );
  }
}
