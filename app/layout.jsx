export const metadata = {
  title: "Reviews Widget",
  description: "Self-hosted Google + Facebook reviews widget",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          color: "#1a2b28",
          background: "#ffffff",
        }}
      >
        {children}
      </body>
    </html>
  );
}
