import { ImageResponse } from 'next/og';
import { DISC_DATA_URI, TILE_LIGHT } from '@/lib/brand';

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
          background: TILE_LIGHT,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          width={Math.round(s * 0.594)}
          height={Math.round(s * 0.594)}
          src={DISC_DATA_URI}
          alt=""
        />
      </div>
    ),
    { width: s, height: s },
  );
}
