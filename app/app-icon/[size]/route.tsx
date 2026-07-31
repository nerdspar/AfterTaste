import { ImageResponse } from 'next/og';

// Generated PNG app icons for the web manifest (e.g. /app-icon/192).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size } = await params;
  const s = Math.max(48, Math.min(512, Number(size) || 512));
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f97316',
          color: 'white',
          fontSize: s * 0.62,
          fontWeight: 800,
          fontFamily: 'sans-serif',
        }}
      >
        A
      </div>
    ),
    { width: s, height: s },
  );
}
