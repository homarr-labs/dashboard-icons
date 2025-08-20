import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, Copy, Download, Github, Link as LinkIcon } from "lucide-react";
import Link from "next/link";
import type React from "react";

export type IconActionsProps = {
  imageUrl: string;
  githubUrl: string;
  iconName: string;
  format: string;
  variantKey: string;
  copiedUrlKey: string | null;
  copiedImageKey: string | null;
  handleDownload: (event: React.MouseEvent, url: string, filename: string) => Promise<void>;
  handleCopyUrl: (url: string, variantKey: string, event?: React.MouseEvent) => void;
  handleCopyImage: (imageUrl: string, format: string, variantKey: string, event?: React.MouseEvent) => Promise<void>;
};

export function IconActions({
  imageUrl,
  githubUrl,
  iconName,
  format,
  variantKey,
  copiedUrlKey,
  copiedImageKey,
  handleDownload,
  handleCopyUrl,
  handleCopyImage,
}: IconActionsProps) {
  const downloadFilename = `${iconName}.${format}`;
  const isUrlCopied = copiedUrlKey === variantKey;
  const isImageCopied = copiedImageKey === variantKey;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex gap-2 mt-3 w-full justify-center">
        {/* Download Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg cursor-pointer"
              onClick={(e) => handleDownload(e, imageUrl, downloadFilename)}
              aria-label={`Download ${iconName} as ${format.toUpperCase()}`}
            >
              <Download className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Download {format.toUpperCase()}</p>
          </TooltipContent>
        </Tooltip>

        {/* Copy Image Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg cursor-pointer"
              onClick={(e) => handleCopyImage(imageUrl, format, variantKey, e)}
              aria-label={`Copy ${iconName} image as ${format.toUpperCase()}`}
            >
              {isImageCopied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Copy image to clipboard</p>
          </TooltipContent>
        </Tooltip>

        {/* Copy URL Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg cursor-pointer"
              onClick={(e) => handleCopyUrl(imageUrl, variantKey, e)}
              aria-label={`Copy direct URL for ${iconName} ${format.toUpperCase()}`}
            >
              {isUrlCopied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <LinkIcon className="w-4 h-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Copy direct URL</p>
          </TooltipContent>
        </Tooltip>

        {/* View on GitHub Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" asChild>
              <Link
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`View ${iconName} ${format} file on GitHub`}
              >
                <Github className="w-4 h-4" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>View on GitHub</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
} 