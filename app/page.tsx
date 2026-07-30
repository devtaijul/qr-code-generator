"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import QRCode from "qrcode";
import { 
  Download, 
  Link as LinkIcon, 
  Palette, 
  Upload, 
  Trash2, 
  Copy, 
  Check, 
  ExternalLink, 
  QrCode, 
  Sliders, 
  Info,
  Maximize2,
  RefreshCw
} from "lucide-react";

// Color presets
const FG_COLORS = [
  { name: "Ink Black", value: "#171717" },
  { name: "Royal Indigo", value: "#4f46e5" },
  { name: "Deep Violet", value: "#7c3aed" },
  { name: "Forest Emerald", value: "#059669" },
  { name: "Crimson Rose", value: "#e11d48" },
  { name: "Warm Amber", value: "#d97706" },
];

const BG_COLORS = [
  { name: "Snow White", value: "#ffffff" },
  { name: "Soft Stone", value: "#f8fafc" },
  { name: "Warm Cream", value: "#fffbeb" },
  { name: "Transparent", value: "transparent" },
];

export default function Home() {
  const [url, setUrl] = useState("https://github.com/google/antigravity");
  const [inputVal, setInputVal] = useState("https://github.com/google/antigravity");
  const [fgColor, setFgColor] = useState("#171717");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [margin, setMargin] = useState(2);
  const [size, setSize] = useState(512);
  const [format, setFormat] = useState<"png" | "jpeg" | "svg">("png");
  const [logo, setLogo] = useState<string | null>(null);
  const [logoName, setLogoName] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [isValidUrl, setIsValidUrl] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debounced URL generator to prevent stuttering on fast typing
  useEffect(() => {
    const handler = setTimeout(() => {
      let formattedUrl = inputVal.trim();
      if (formattedUrl) {
        // Auto-prepend https:// if they enter e.g. "google.com"
        if (!/^https?:\/\//i.test(formattedUrl)) {
          // If it looks like a domain, prepend https://
          if (formattedUrl.includes(".") && !formattedUrl.includes(" ")) {
            formattedUrl = `https://${formattedUrl}`;
          }
        }
        setUrl(formattedUrl);
        
        // Basic URL validation
        try {
          new URL(formattedUrl);
          setIsValidUrl(true);
        } catch {
          setIsValidUrl(false);
        }
      } else {
        setUrl("");
        setIsValidUrl(false);
      }
    }, 250);

    return () => clearTimeout(handler);
  }, [inputVal]);

  // Main QR Code canvas rendering logic
  const renderQRCode = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    
    if (!url) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = bgColor === "transparent" ? "#ffffff00" : bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const options = {
      width: size,
      margin: margin,
      errorCorrectionLevel: (logo ? "H" : "Q") as "H" | "Q", // Use High correction level if a logo is loaded
      color: {
        dark: fgColor,
        light: bgColor === "transparent" ? "#00000000" : bgColor,
      },
    };

    QRCode.toCanvas(canvas, url, options, (error) => {
      if (error) {
        console.error("QR Code generation error:", error);
        return;
      }

      // If a custom logo exists, composite it on top of the QR code
      if (logo) {
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const img = new window.Image();
        img.src = logo;
        img.onload = () => {
          // The logo should occupy around 20% of the canvas width
          const logoSize = canvas.width * 0.20;
          const x = (canvas.width - logoSize) / 2;
          const y = (canvas.height - logoSize) / 2;
          const padding = 6;
          const cornerRadius = logoSize * 0.22;

          ctx.save();

          // 1. Draw rounded background/mask card behind the logo
          ctx.fillStyle = bgColor === "transparent" ? "#ffffff" : bgColor;
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(x - padding, y - padding, logoSize + padding * 2, logoSize + padding * 2, cornerRadius + 2);
          } else {
            ctx.rect(x - padding, y - padding, logoSize + padding * 2, logoSize + padding * 2);
          }
          ctx.fill();

          // 2. Draw the rounded border ring for extra aesthetics
          ctx.strokeStyle = fgColor;
          ctx.lineWidth = 2;
          ctx.stroke();

          // 3. Draw and clip the logo image
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(x, y, logoSize, logoSize, cornerRadius);
          } else {
            ctx.rect(x, y, logoSize, logoSize);
          }
          ctx.clip();
          ctx.drawImage(img, x, y, logoSize, logoSize);

          ctx.restore();
        };
      }
    });
  }, [url, fgColor, bgColor, margin, size, logo]);

  // Re-run rendering whenever states change
  useEffect(() => {
    renderQRCode();
  }, [renderQRCode]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setLogo(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogo(null);
    setLogoName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Download functionality
  const downloadQRCode = async () => {
    if (!url) return;
    setDownloading(true);

    try {
      if (format === "svg") {
        const options = {
          width: size,
          margin: margin,
          errorCorrectionLevel: (logo ? "H" : "Q") as "H" | "Q",
          color: {
            dark: fgColor,
            light: bgColor === "transparent" ? "#00000000" : bgColor,
          },
        };

        let svgString = await QRCode.toString(url, {
          ...options,
          type: "svg",
        });

        // Inject logo into the generated SVG if it exists
        if (logo) {
          const logoSize = size * 0.20;
          const x = (size - logoSize) / 2;
          const y = (size - logoSize) / 2;
          const radius = logoSize * 0.22;

          const logoSvgOverlay = `
            <g id="logo-overlay-container">
              <!-- Mask background -->
              <rect x="${x - 6}" y="${y - 6}" width="${logoSize + 12}" height="${logoSize + 12}" fill="${bgColor === "transparent" ? "#ffffff" : bgColor}" rx="${radius + 2}" ry="${radius + 2}" />
              <!-- Border ring -->
              <rect x="${x - 6}" y="${y - 6}" width="${logoSize + 12}" height="${logoSize + 12}" fill="none" stroke="${fgColor}" stroke-width="2" rx="${radius + 2}" ry="${radius + 2}" />
              <!-- Clip path for image -->
              <clipPath id="logo-clip-path">
                <rect x="${x}" y="${y}" width="${logoSize}" height="${logoSize}" rx="${radius}" ry="${radius}" />
              </clipPath>
              <!-- Base64 Image -->
              <image x="${x}" y="${y}" width="${logoSize}" height="${logoSize}" href="${logo}" clip-path="url(#logo-clip-path)" />
            </g>
          `;
          // Insert the logo element before closing </svg> tag
          svgString = svgString.replace("</svg>", `${logoSvgOverlay}</svg>`);
        }

        const blob = new Blob([svgString], { type: "image/svg+xml" });
        const downloadUrl = URL.createObjectURL(blob);
        triggerBrowserDownload(downloadUrl, `qrcode-${Date.now()}.svg`);
        URL.revokeObjectURL(downloadUrl);
      } else {
        // PNG & JPEG download
        if (!canvasRef.current) return;
        let finalCanvas = canvasRef.current;

        // If JPEG and background is transparent, create temporary canvas with white background
        if (format === "jpeg" && bgColor === "transparent") {
          const tempCanvas = document.createElement("canvas");
          tempCanvas.width = finalCanvas.width;
          tempCanvas.height = finalCanvas.height;
          const tempCtx = tempCanvas.getContext("2d");
          if (tempCtx) {
            tempCtx.fillStyle = "#ffffff";
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.drawImage(finalCanvas, 0, 0);
            finalCanvas = tempCanvas;
          }
        }

        const mimeType = format === "png" ? "image/png" : "image/jpeg";
        const downloadUrl = finalCanvas.toDataURL(mimeType);
        triggerBrowserDownload(downloadUrl, `qrcode-${Date.now()}.${format}`);
      }
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setTimeout(() => setDownloading(false), 600);
    }
  };

  const triggerBrowserDownload = (href: string, filename: string) => {
    const link = document.createElement("a");
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy Image to Clipboard
  const copyToClipboard = async () => {
    if (!canvasRef.current) return;
    try {
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) return;
        const data = [new ClipboardItem({ "image/png": blob })];
        await navigator.clipboard.write(data);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }, "image/png");
    } catch (err) {
      console.warn("Failed to copy canvas as image, copying text URL as fallback:", err);
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.25),rgba(255,255,255,0))] text-slate-100 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white">
      
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/40 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600/20 text-indigo-400 p-2 rounded-xl border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
              <QrCode className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg bg-gradient-to-r from-indigo-200 via-indigo-400 to-indigo-200 bg-clip-text text-transparent">
                AURA QR
              </h1>
              <p className="text-[10px] text-slate-400 tracking-wider font-semibold uppercase">QR Code Generator</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span className="hidden md:inline">High Resolution • Embedded Logo Support</span>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 lg:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Customization Form (7 cols) */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Card: URL Input */}
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl shadow-xl flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-indigo-400" />
              <h2 className="font-semibold text-base text-slate-200">1. Enter Website Link</h2>
            </div>
            
            <div className="relative">
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Enter URL (e.g., google.com or https://yourpage.com)"
                className={`w-full bg-slate-900/80 border ${
                  !isValidUrl && inputVal.trim() !== "" 
                    ? "border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/20" 
                    : "border-slate-700/80 focus:border-indigo-500 focus:ring-indigo-500/20"
                } rounded-xl px-4 py-3.5 pr-10 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-4 transition duration-200 text-sm`}
              />
              <div className="absolute right-3.5 top-3.5 flex items-center gap-2">
                {inputVal && (
                  <button 
                    onClick={() => { setInputVal(""); setUrl(""); }}
                    className="text-slate-500 hover:text-slate-300 transition p-0.5 rounded-full hover:bg-slate-800"
                    title="Clear Input"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Validation Message */}
            {inputVal.trim() !== "" && (
              <div className="flex items-center gap-2 text-xs">
                {isValidUrl ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Valid Link:
                    <span className="text-slate-300 font-mono select-all underline decoration-emerald-500/30 underline-offset-2">
                      {url}
                    </span>
                  </span>
                ) : (
                  <span className="text-rose-400 flex items-center gap-1">
                    <Info className="h-3 w-3" /> Input format is invalid or incomplete
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Card: Appearance Customization */}
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl shadow-xl flex flex-col gap-6">
            
            <div className="flex items-center gap-2 border-b border-slate-800/60 pb-4">
              <Palette className="h-5 w-5 text-indigo-400" />
              <h2 className="font-semibold text-base text-slate-200">2. Customize Styling</h2>
            </div>

            {/* Sub-section: Colors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Foreground Color Picker */}
              <div className="flex flex-col gap-3">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">QR Code Color</label>
                <div className="flex flex-wrap gap-2">
                  {FG_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setFgColor(color.value)}
                      className="w-8 h-8 rounded-full border border-slate-800 relative transition-transform hover:scale-110 active:scale-95 animate-none cursor-pointer"
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    >
                      {fgColor === color.value && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-full">
                          <Check className="h-4 w-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
                        </span>
                      )}
                    </button>
                  ))}
                  <div className="relative w-8 h-8 rounded-full border border-slate-700/80 hover:border-slate-500 transition-colors overflow-hidden group">
                    <input
                      type="color"
                      value={fgColor}
                      onChange={(e) => setFgColor(e.target.value)}
                      className="absolute inset-[-4px] w-[calc(100%+8px)] h-[calc(100%+8px)] cursor-pointer"
                      title="Custom Color"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-slate-400 font-mono">Hex: {fgColor.toUpperCase()}</span>
                </div>
              </div>

              {/* Background Color Picker */}
              <div className="flex flex-col gap-3">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Background Color</label>
                <div className="flex flex-wrap gap-2">
                  {BG_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setBgColor(color.value)}
                      className="w-8 h-8 rounded-full border border-slate-700/85 relative transition-transform hover:scale-110 active:scale-95 overflow-hidden cursor-pointer"
                      style={{ 
                        backgroundColor: color.value === "transparent" ? "#000000" : color.value,
                        backgroundImage: color.value === "transparent" ? "linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)" : "none",
                        backgroundSize: "8px 8px"
                      }}
                      title={color.name}
                    >
                      {bgColor === color.value && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-full">
                          <Check className={`h-4 w-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] ${bgColor === "#ffffff" || bgColor === "#f8fafc" || bgColor === "#fffbeb" ? "text-slate-900" : "text-white"}`} />
                        </span>
                      )}
                    </button>
                  ))}
                  <div className="relative w-8 h-8 rounded-full border border-slate-700/80 hover:border-slate-500 transition-colors overflow-hidden">
                    <input
                      type="color"
                      value={bgColor === "transparent" ? "#ffffff" : bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="absolute inset-[-4px] w-[calc(100%+8px)] h-[calc(100%+8px)] cursor-pointer"
                      title="Custom Background"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-slate-400 font-mono">
                    Mode: {bgColor === "transparent" ? "Transparent" : bgColor.toUpperCase()}
                  </span>
                </div>
              </div>

            </div>

            {/* Sub-section: Layout Configurations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-800/40 pt-6">
              
              {/* Margin Selector */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quiet Zone (Margin)</label>
                  <span className="text-xs text-indigo-400 font-medium">{margin} modules</span>
                </div>
                <div className="flex gap-2">
                  {[0, 1, 2, 4].map((m) => (
                    <button
                      key={m}
                      onClick={() => setMargin(m)}
                      className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-medium cursor-pointer transition duration-150 ${
                        margin === m 
                          ? "bg-indigo-600/20 border-indigo-500/80 text-indigo-300" 
                          : "bg-slate-900 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                      }`}
                    >
                      {m === 0 ? "None" : m === 1 ? "Tight" : m === 2 ? "Normal" : "Wide"}
                    </button>
                  ))}
                </div>
              </div>

              {/* High-Res Download Resolution */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Download Size</label>
                  <span className="text-xs text-indigo-400 font-medium">{size} × {size} px</span>
                </div>
                <input
                  type="range"
                  min="256"
                  max="1024"
                  step="128"
                  value={size}
                  onChange={(e) => setSize(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Standard (256px)</span>
                  <span className="text-slate-400 font-medium">Print Quality ({size >= 512 ? "Excellent" : "Good"})</span>
                  <span>Ultra-HD (1024px)</span>
                </div>
              </div>

            </div>

            {/* Sub-section: Logo Branding */}
            <div className="border-t border-slate-800/40 pt-6 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-indigo-400" />
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Logo Customization (Optional)</h3>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/png, image/jpeg"
                    onChange={handleLogoUpload}
                    ref={fileInputRef}
                    className="hidden"
                    id="logo-upload"
                  />
                  <label
                    htmlFor="logo-upload"
                    className="flex items-center justify-center gap-2 w-full bg-slate-900 border border-dashed border-slate-700 hover:border-indigo-500 rounded-xl px-4 py-3 cursor-pointer text-xs font-medium text-slate-400 hover:text-slate-200 transition duration-150"
                  >
                    <Upload className="h-4 w-4 text-slate-400" />
                    {logoName ? `Change: ${logoName.slice(0, 15)}...` : "Upload Center Logo (PNG/JPG)"}
                  </label>
                </div>

                {logo && (
                  <button
                    onClick={removeLogo}
                    className="flex items-center justify-center gap-2 bg-rose-950/20 border border-rose-800/40 hover:bg-rose-900/30 text-rose-400 rounded-xl px-4 py-3 text-xs font-medium transition duration-150 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove Logo
                  </button>
                )}
              </div>

              {logo && (
                <div className="bg-indigo-950/20 border border-indigo-900/30 rounded-xl p-3 flex items-start gap-2.5 text-xs text-indigo-300 animate-fadeIn">
                  <Info className="h-4 w-4 shrink-0 text-indigo-400 mt-0.5" />
                  <p>
                    Adding a logo automatically increases the QR Code error correction level to <strong>High (30% recovery)</strong>. This guarantees your code remains fully readable when scanned.
                  </p>
                </div>
              )}
            </div>

          </div>

        </section>

        {/* Right Side: Preview & Download Card (5 cols) */}
        <section className="lg:col-span-5 flex flex-col gap-6 sticky top-24">
          
          {/* Card Container */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-2xl flex flex-col items-center gap-6 relative overflow-hidden group">
            
            {/* Visual background ambient glow inside the card */}
            <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition duration-500"></div>

            <div className="w-full flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">Live Output</span>
              
              <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 px-2.5 py-1 rounded-full text-xs text-indigo-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Interactive
              </div>
            </div>

            {/* QR Code Canvas container wrapper */}
            <div className="w-full max-w-[280px] aspect-square bg-slate-900 rounded-2xl border border-slate-800/80 p-5 flex items-center justify-center relative group/qr shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
              
              {/* Corner target decorators simulating a scan frame */}
              <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-slate-600 rounded-tl-md group-hover/qr:border-indigo-400 transition"></div>
              <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-slate-600 rounded-tr-md group-hover/qr:border-indigo-400 transition"></div>
              <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-slate-600 rounded-bl-md group-hover/qr:border-indigo-400 transition"></div>
              <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-slate-600 rounded-br-md group-hover/qr:border-indigo-400 transition"></div>

              {/* The actual rendering canvas */}
              <canvas 
                ref={canvasRef}
                className="w-full h-full object-contain rounded-lg drop-shadow-md select-none transition-transform duration-300"
                style={{ 
                  maxWidth: "240px", 
                  maxHeight: "240px",
                }}
              />

              {!url && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 rounded-2xl p-4 text-center">
                  <Maximize2 className="h-8 w-8 text-slate-500 mb-2 animate-bounce" />
                  <p className="text-xs text-slate-400">Waiting for website link...</p>
                </div>
              )}
            </div>

            {/* Simulated Live Action Link */}
            {url && (
              <div className="w-full text-center flex flex-col gap-1 items-center bg-slate-900/40 border border-slate-800/50 p-3 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Destination URL</span>
                <a 
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition break-all line-clamp-1 max-w-[240px]"
                >
                  {url}
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </a>
              </div>
            )}

            {/* Format Selector Tab */}
            <div className="w-full flex flex-col gap-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left pl-1">Download Format</label>
              <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex gap-1">
                {(["png", "jpeg", "svg"] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setFormat(fmt)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg uppercase cursor-pointer transition ${
                      format === fmt
                        ? "bg-slate-800 text-indigo-400 shadow-sm border border-slate-700/60"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons Grid */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              <button
                disabled={!url}
                onClick={copyToClipboard}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 border border-slate-700 hover:border-slate-500 disabled:opacity-50 disabled:hover:border-slate-700 text-slate-200 font-semibold py-3 px-4 rounded-xl text-xs transition duration-150 active:scale-[0.98] cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy to Clipboard
                  </>
                )}
              </button>

              <button
                disabled={!url || downloading}
                onClick={downloadQRCode}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-semibold py-3 px-4 rounded-xl text-xs shadow-lg shadow-indigo-600/20 transition duration-150 active:scale-[0.98] cursor-pointer"
              >
                {downloading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Download Code
                  </>
                )}
              </button>

            </div>

            <div className="w-full text-center flex items-center justify-center gap-1.5 text-[11px] text-slate-500 mt-1">
              <Info className="h-3.5 w-3.5" />
              <span>Scan test with any mobile phone camera.</span>
            </div>

          </div>

        </section>

      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950/20 py-8 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© 2026 Aura QR Generator. All rights reserved.</p>
          <div className="flex gap-4">
            <span className="hover:text-slate-400 transition cursor-help">Security Inspected</span>
            <span>•</span>
            <span className="hover:text-slate-400 transition cursor-help">High Density Vector</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
