export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="page-wrapper flex items-center justify-center">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
