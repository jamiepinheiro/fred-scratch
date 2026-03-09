export const metadata = {
  title: 'Hello AI Chat',
  description: 'Simple Vercel AI SDK chat example'
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
