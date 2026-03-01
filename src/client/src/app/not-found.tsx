import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center py-16">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>404 - Not Found</CardTitle>
          <CardDescription>
            Sorry, the page you are looking for does not exist.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
