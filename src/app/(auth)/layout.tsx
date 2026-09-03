export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <main className="min-h-svh p-4 sm:p-6">{children}</main>;
}
