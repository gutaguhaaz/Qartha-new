export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-card border-t border-border py-4 text-center text-sm text-foreground">
      &copy; {year} Rk Squared, Cox &amp; Inpro Telecom. All Rights Reserved.
    </footer>
  );
}
