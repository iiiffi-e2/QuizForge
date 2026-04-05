import { getSiteUrl } from "@/lib/site-url";

export function SiteJsonLd() {
  const site = getSiteUrl();
  const url = site.toString();
  const graph = [
    {
      "@type": "WebSite",
      "@id": `${url}#website`,
      name: "QuizForge",
      url,
      description: "Turn anything into a quiz",
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${url}#app`,
      name: "QuizForge",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      url,
      description: "Turn anything into a quiz",
    },
  ];

  const json = {
    "@context": "https://schema.org",
    "@graph": graph,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
