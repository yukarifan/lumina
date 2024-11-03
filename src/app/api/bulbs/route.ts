import { NextResponse } from 'next/server';
import bulbsData from '@/data/bulbs.json';

export async function GET() {
  return NextResponse.json(bulbsData);
} 