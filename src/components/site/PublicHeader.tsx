import Link from "next/link";

export function PublicHeader() {
  return (
    <header className="public-header">
      <div className="public-header-inner">
        <Link href="/" className="public-logo">
          La Madrina
        </Link>
        <nav className="public-nav" aria-label="Main">
          <Link href="/">Home</Link>
          <Link href="/shop">Shop</Link>
        </nav>
      </div>
    </header>
  );
}
