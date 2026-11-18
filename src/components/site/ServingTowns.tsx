import Link from "next/link";
import { Fragment } from "react";
import { business } from "@/config/business";
import { areaPages, areaPath } from "@/lib/routes";

/** "Norwalk, Sandusky, Huron, Willard & surrounding areas" with links to the area pages that exist. */
export function ServingTowns() {
  const withPage = new Set(areaPages().map((a) => a.slug));
  return (
    <>
      {business.serviceAreas.map((a, i) => (
        <Fragment key={a.slug}>
          {i > 0 ? ", " : null}
          {withPage.has(a.slug) ? <Link href={areaPath(a.slug)}>{a.name}</Link> : a.name}
        </Fragment>
      ))}
      {" "}&amp; surrounding areas
    </>
  );
}
