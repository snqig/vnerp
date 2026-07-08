import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'scripts', 'db-relations.json');
    const data = fs.readFileSync(filePath, 'utf8');
    const relations = JSON.parse(data);

    return NextResponse.json(relations);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load database relations' },
      { status: 500 }
    );
  }
}
