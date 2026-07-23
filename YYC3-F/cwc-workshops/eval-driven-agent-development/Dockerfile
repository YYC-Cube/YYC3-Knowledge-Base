FROM debian:bookworm-slim

# fonts-crosextra-carlito  -> Calibri-metric-compatible (python-pptx default)
# fonts-liberation         -> Arial/Times/Courier-metric-compatible
# fonts-noto-color-emoji   -> color emoji
# fonts-symbola            -> monochrome fallback for any symbol/emoji codepoint
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      libreoffice poppler-utils fontconfig \
      fonts-crosextra-carlito fonts-liberation fonts-dejavu \
      fonts-noto-core fonts-noto-color-emoji fonts-symbola \
 && rm -rf /var/lib/apt/lists/*

# Append symbol/emoji fonts to every family's fallback chain so dingbats
# resolve. Note: LibreOffice's VCL layer still won't render color emoji
# reliably — known limitation. Open the .pptx directly to see those.
RUN printf '%s\n' \
  '<?xml version="1.0"?>' \
  '<!DOCTYPE fontconfig SYSTEM "fonts.dtd">' \
  '<fontconfig>' \
  '  <match target="pattern">' \
  '    <edit name="family" mode="append"><string>Symbola</string></edit>' \
  '    <edit name="family" mode="append"><string>Noto Color Emoji</string></edit>' \
  '  </match>' \
  '</fontconfig>' \
  > /etc/fonts/conf.d/99-symbol-fallback.conf \
 && fc-cache -f
