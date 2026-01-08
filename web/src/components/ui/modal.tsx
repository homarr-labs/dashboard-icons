"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Modal({
	...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
	return <DialogPrimitive.Root data-slot="modal" {...props} />
}

function ModalTrigger({
	...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
	return <DialogPrimitive.Trigger data-slot="modal-trigger" {...props} />
}

function ModalPortal({
	...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
	return <DialogPrimitive.Portal data-slot="modal-portal" {...props} />
}

function ModalClose({
	...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
	return <DialogPrimitive.Close data-slot="modal-close" {...props} />
}

function ModalOverlay({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
	return (
		<DialogPrimitive.Overlay
			data-slot="modal-overlay"
			className={cn(
				"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
				className
			)}
			{...props}
		/>
	)
}

type ModalContentProps = React.ComponentProps<typeof DialogPrimitive.Content> & {
	showCloseButton?: boolean
	size?: "xs" | "sm" | "md" | "lg" | "xl" | "full" | string
}

function ModalContent({
	className,
	children,
	showCloseButton = true,
	size = "md",
	...props
}: ModalContentProps) {
	const sizeClasses = {
		xs: "max-w-xs",
		sm: "max-w-sm",
		md: "max-w-md",
		lg: "max-w-lg",
		xl: "max-w-7xl",
		full: "max-w-[95vw] w-full h-[90vh]",
	}

	const sizeClass =
		typeof size === "string" && size in sizeClasses
			? sizeClasses[size as keyof typeof sizeClasses]
			: typeof size === "string"
				? size
				: sizeClasses.md

	return (
		<ModalPortal data-slot="modal-portal">
			<ModalOverlay />
			<DialogPrimitive.Content
				data-slot="modal-content"
				className={cn(
					"bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border shadow-lg duration-200",
					size === "full" ? "h-[90vh] max-h-[90vh]" : "max-h-[90vh]",
					sizeClass,
					className
				)}
				{...props}
			>
				{children}
				{showCloseButton && (
					<DialogPrimitive.Close
						data-slot="modal-close"
						className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
					>
						<XIcon />
						<span className="sr-only">Close</span>
					</DialogPrimitive.Close>
				)}
			</DialogPrimitive.Content>
		</ModalPortal>
	)
}

function ModalHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="modal-header"
			className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
			{...props}
		/>
	)
}

function ModalFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="modal-footer"
			className={cn(
				"flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
				className
			)}
			{...props}
		/>
	)
}

function ModalTitle({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
	return (
		<DialogPrimitive.Title
			data-slot="modal-title"
			className={cn("text-lg leading-none font-semibold", className)}
			{...props}
		/>
	)
}

function ModalDescription({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
	return (
		<DialogPrimitive.Description
			data-slot="modal-description"
			className={cn("text-muted-foreground text-sm", className)}
			{...props}
		/>
	)
}

export {
	Modal,
	ModalClose,
	ModalContent,
	ModalDescription,
	ModalFooter,
	ModalHeader,
	ModalOverlay,
	ModalPortal,
	ModalTitle,
	ModalTrigger,
}



