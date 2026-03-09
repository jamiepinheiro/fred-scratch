export const metadata = {
  title: 'Imposter Offline (AI Bots)',
  description: 'Play an imposter social game solo with AI bot players.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'Inter, system-ui, sans-serif', background: '#0b1020', color: '#e8ecff' }}>
        {children}
      </body>
    </html>
  );
}
