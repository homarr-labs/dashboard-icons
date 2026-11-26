export const serviceListLayouts = ["tiles", "list", "focus"] as const
export type ServiceListLayout = (typeof serviceListLayouts)[number]

export function parseServiceListLayout(value: unknown): ServiceListLayout | undefined {
	return serviceListLayouts.find((layout) => layout === value)
}
