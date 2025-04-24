type StructuredDataProps = {
  data: any
  id?: string
}

export const StructuredData = ({ data, id }: StructuredDataProps) => {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

type WebsiteStructuredDataProps = {
  websiteSchema: any
  organizationSchema: any
}

export const WebsiteStructuredData = ({
  websiteSchema,
  organizationSchema
}: WebsiteStructuredDataProps) => {
  return (
    <>
      <StructuredData data={websiteSchema} id="website-schema" />
      <StructuredData data={organizationSchema} id="organization-schema" />
    </>
  )
}