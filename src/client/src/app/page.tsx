import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Data Entry Generator</CardTitle>
          <CardDescription>
            Manage registrations and perform dynamic CRUD operations on your registered tables.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Admin Panel</CardTitle>
            <CardDescription>
              Initialize, discover, and remove registrations.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/admin" className="ml-auto">
              <Button size="sm">Open Admin Panel</Button>
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Registered Tables</CardTitle>
            <CardDescription>
              Browse registered tables and perform CRUD on table rows.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/tables" className="ml-auto">
              <Button size="sm">Open Tables</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

