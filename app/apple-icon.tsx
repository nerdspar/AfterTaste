import { ImageResponse } from 'next/og';
import { DISC_DATA_URI, TILE_LIGHT } from '@/lib/brand';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

// Home-screen icon for iOS ("Add to Home Screen").
export default function AppleIcon() {
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
        <img width={107} height={107} src={DISC_DATA_URI} alt="" />
      </div>
    ),
    size,
  );
}
