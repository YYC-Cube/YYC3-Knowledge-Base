import React, { useEffect, useRef } from 'react';
import DeviceFrame from './DeviceFrame';

interface PreviewPanelProps {
    renderedHtml: string;
    deviceWidthClass: string;
    previewDevice: 'mobile' | 'tablet' | 'pc';
    previewRef: React.MutableRefObject<HTMLDivElement | null>;
    previewOuterScrollRef: React.RefObject<HTMLDivElement>;
    previewInnerScrollRef: React.RefObject<HTMLDivElement>;
    onPreviewOuterScroll: () => void;
    onPreviewInnerScroll: () => void;
    scrollSyncEnabled: boolean;
    onImageClick?: (info: { type: string; index: number; src?: string; alt?: string }) => void;
}

export default function PreviewPanel({
    renderedHtml,
    deviceWidthClass,
    previewDevice,
    previewRef,
    previewOuterScrollRef,
    previewInnerScrollRef,
    onPreviewOuterScroll,
    onPreviewInnerScroll,
    scrollSyncEnabled,
    onImageClick
}: PreviewPanelProps) {
    const isFramedDevice = previewDevice !== 'pc';
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // Sync internal contentRef to external previewRef
    useEffect(() => {
        if (!previewRef || !contentRef.current) return;
        previewRef.current = contentRef.current;
    }, [previewRef]);

    useEffect(() => {
        if (!onImageClick) return;

        const handleElementClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;

            // Find the closest element with location data
            const element = target.closest('[data-md-type]') as HTMLElement;
            if (!element) return;

            const mdType = element.getAttribute('data-md-type');
            const mdIndex = element.getAttribute('data-md-index');

            if (!mdType || mdIndex === null) return;

            // Check if clicked on a link - if so, don't prevent default behavior
            const clickedLink = target.closest('a') as HTMLAnchorElement;
            if (clickedLink) {
                // Link: let it navigate normally
                return;
            }

            // Other elements: prevent default and trigger location
            e.preventDefault();
            e.stopPropagation();

            // Prepare click info object
            const clickInfo: { type: string; index: number; src?: string; alt?: string; content?: string } = {
                type: mdType,
                index: parseInt(mdIndex, 10)
            };


            // For images, include src and alt
            if (mdType === 'image' && target.tagName === 'IMG') {
                const img = target as HTMLImageElement;

                // Use getAttribute('src') to preserve original path (e.g., "./images/photo.png")
                // img.src returns resolved absolute URL, which won't match markdown text
                const originalSrc = img.getAttribute('src') || img.src;

                clickInfo.src = originalSrc;
                clickInfo.alt = img.alt || img.getAttribute('alt') || '';
            }

            onImageClick(clickInfo);
        };

        // Use event delegation on document to handle clicks on dynamically rendered content
        document.addEventListener('click', handleElementClick);

        // Add visual feedback style for all clickable elements
        const style = document.createElement('style');
        style.textContent = `
            .preview-content [data-md-type] {
                cursor: pointer;
                transition: background-color 0.2s ease, outline 0.2s ease;
            }
            .preview-content [data-md-type="image"]:hover,
            .preview-content [data-md-type="paragraph"]:hover {
                background-color: rgba(0, 102, 204, 0.05);
                border-radius: 4px;
            }
            .preview-content [data-md-type="heading"]:hover {
                background-color: rgba(0, 102, 204, 0.05);
                border-radius: 4px;
            }
            .preview-content img:hover {
                outline: 2px solid rgba(0, 102, 204, 0.5);
                outline-offset: 2px;
            }
        `;
        document.head.appendChild(style);

        return () => {
            document.removeEventListener('click', handleElementClick);
            document.head.removeChild(style);
        };
    }, [onImageClick]);

    return (
        <div
            ref={previewOuterScrollRef}
            data-testid="preview-outer-scroll"
            onScroll={scrollSyncEnabled && !isFramedDevice ? onPreviewOuterScroll : undefined}
            className="relative overflow-y-auto no-scrollbar bg-[#f2f2f7]/50 dark:bg-[#000000] flex flex-col z-20 flex-1 min-h-0 w-full overflow-x-hidden"
        >
            <div
                ref={containerRef}
                className={`${deviceWidthClass} transition-all duration-500 ${isFramedDevice ? 'self-center my-12 px-4 lg:px-8' : 'mt-12 mb-32 ml-4 md:ml-6 mr-auto'} h-fit min-h-[calc(100%-48px)] flex items-start justify-center relative`}
            >
                {isFramedDevice ? (
                    <DeviceFrame
                        device={previewDevice as 'mobile' | 'tablet'}
                        scrollRef={previewInnerScrollRef}
                        onScroll={scrollSyncEnabled ? onPreviewInnerScroll : undefined}
                    >
                        <div
                            ref={contentRef}
                            data-testid="preview-content"
                            dangerouslySetInnerHTML={{ __html: renderedHtml }}
                            className={`preview-content min-w-full ${previewDevice === 'mobile' ? 'px-1 pt-1 pb-8' : 'px-2 pt-2 pb-10'}`}
                        />
                    </DeviceFrame>
                ) : (
                    <div className="bg-white rounded-[24px] overflow-hidden shadow-apple-lg transition-all duration-500 ring-1 ring-[#00000008] border-t border-white/50 w-full">
                        <div
                            ref={contentRef}
                            data-testid="preview-content"
                            dangerouslySetInnerHTML={{ __html: renderedHtml }}
                            className="preview-content min-w-full"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
