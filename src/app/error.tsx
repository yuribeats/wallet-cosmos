'use client';

export default function Error({ error }: { error: Error & { digest?: string } }) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#0a0a0f',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px',
      fontFamily: 'monospace',
    }}>
      <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '20px', textTransform: 'uppercase' }}>
        CLIENT ERROR
      </div>
      <div style={{ fontSize: '12px', color: '#FF0420', maxWidth: '600px', wordBreak: 'break-all', marginBottom: '12px' }}>
        {error.message}
      </div>
      <div style={{ fontSize: '10px', color: '#666', maxWidth: '600px', wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
        {error.stack}
      </div>
    </div>
  );
}
