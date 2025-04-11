import { IconDetails } from "@/components/icon-details"
import { BASE_URL } from "@/constants"
import { getAllIcons, getAuthorData } from "@/lib/api"
import type { Metadata, ResolvingMetadata } from "next"
import { notFound } from "next/navigation"

export async function generateStaticParams() {
  const iconsData = await getAllIcons()
  console.log(`Found ${Object.keys(iconsData).length} icons`)
  return Object.keys(iconsData).map((icon) => ({
    icon,
  }))
}

type Props = {
  params: Promise<{ icon: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ params, searchParams }: Props, parent: ResolvingMetadata): Promise<Metadata> {
  // read route params
  const { icon } = await params
  const iconsData = await getAllIcons()

  // Check if icon exists
  if (!iconsData[icon]) {
    return {
      title: "Icon Not Found",
    }
  }

  // optionally access and extend (rather than replace) parent metadata
  const previousImages = (await parent).openGraph?.images || []
  const authorData = await getAuthorData(iconsData[icon].update.author.id)

  console.debug(
    `Generated metadata for ${icon} by ${authorData.name} (${authorData.html_url}) updated at ${new Date(iconsData[icon].update.timestamp).toLocaleString()}`,
  )

  return {
    title: `${icon} icon · DashboardIcons`,
    description: `Download and use the ${icon} icon from DashboardIcons, updated at ${new Date(iconsData[icon].update.timestamp).toLocaleString()} by ${authorData.name}`,
    authors: [
      {
        name: "homarr",
        url: "https://homarr.dev",
      },
      {
        name: authorData.name,
        url: authorData.html_url,
      },
    ],
    openGraph: {
      images: [`${BASE_URL}/${iconsData[icon].base}/${icon}.${iconsData[icon].base}`, ...previousImages],
    },
  }
}

export default async function IconPage({ params }: { params: Promise<{ icon: string }> }) {
  const { icon } = await params
  const iconsData = await getAllIcons()
  const iconData = iconsData[icon]

  if (!iconData) {
    notFound()
  }

  try {
    const authorData = await getAuthorData(iconData.update.author.id)

    return (
      <>
        <IconDetails icon={icon} iconData={iconData} authorData={authorData} />
      </>
    )
  } catch (error) {
    console.error(`Error fetching author data for ${icon}:`, error)
    // Provide a fallback author data object
    const fallbackAuthor = {
      login: iconData.update.author.id,
      avatar_url: `https://github.com/${iconData.update.author.id}.png`,
      html_url: `https://github.com/${iconData.update.author.id}`,
    }

    return (
      <>
        <IconDetails icon={icon} iconData={iconData} authorData={fallbackAuthor} />
      </>
    )
  }
}
