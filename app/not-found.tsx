import Link from "next/link";

export default function NotFound() {
  return (
    <html lang="en">
      <body>
        <div className="wrap">
          <h1>That route doesn&apos;t exist</h1>
          <p className="dek">
            We couldn&apos;t find those two cities. Try picking them from the list instead.
          </p>
          <p><Link className="gobtn" href="/en">Start over</Link></p>
        </div>
      </body>
    </html>
  );
}
