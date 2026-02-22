import React, { useRef, useEffect, useState } from 'react';
import { Bold, Italic, Underline, Table, Image as ImageIcon, RotateCcw, IndentIncrease, IndentDecrease, Upload, Link, Grid3X3, Type, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  onPasteMultipleOptions?: (options: string[]) => void;
}

// Parse pasted text that contains multiple labeled options (a. b. c. / A) B) C) / 1. 2. 3. etc.)
function parseMultipleOptions(text: string): string[] | null {
  if (!text || text.trim().length === 0) return null;

  // Pattern: lines starting with a/b/c/d/e (or A/B/C/D/E) followed by . or ) then the option text
  // Also supports 1. 2. 3. 4. 5. numbering
  const letterPattern = /^[a-eA-E][.)]\s*/;
  const numberPattern = /^[1-5][.)]\s*/;

  // Split by newlines
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

  if (lines.length < 2) return null;

  // Try letter-based detection first
  const letterMatches = lines.filter(l => letterPattern.test(l));
  if (letterMatches.length >= 2 && letterMatches.length === lines.length) {
    return lines.map(l => l.replace(letterPattern, '').trim());
  }

  // Try number-based detection
  const numberMatches = lines.filter(l => numberPattern.test(l));
  if (numberMatches.length >= 2 && numberMatches.length === lines.length) {
    return lines.map(l => l.replace(numberPattern, '').trim());
  }

  return null;
}


export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder, minHeight = '100px', onPasteMultipleOptions }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Table dialog state
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [tableRows, setTableRows] = useState(2);
  const [tableCols, setTableCols] = useState(2);

  // Image dialog state
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  // Font size options
  const fontSizes = [
    { label: '10px', value: '1' },
    { label: '12px', value: '2' },
    { label: '14px', value: '3' },
    { label: '16px', value: '4' },
    { label: '18px', value: '5' },
    { label: '24px', value: '6' },
    { label: '32px', value: '7' },
  ];

  // Sync initial value only once or when value changes externally significantly 
  useEffect(() => {
    if (contentRef.current && contentRef.current.innerHTML !== value) {
      contentRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = () => {
    if (contentRef.current) {
      onChange(contentRef.current.innerHTML);
    }
  };

  const execCmd = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (contentRef.current) contentRef.current.focus();
    handleInput();
  };

  // Clean table HTML - remove Word-specific attributes and styles, keep structure
  const cleanTableHtml = (tableElement: Element): string => {
    const table = tableElement.cloneNode(true) as HTMLTableElement;

    const allElements = table.querySelectorAll('*');
    allElements.forEach(el => {
      el.removeAttribute('class');
      el.removeAttribute('data-mce-style');
      el.removeAttribute('data-mce-selected');

      if (el.tagName === 'TD' || el.tagName === 'TH') {
        el.setAttribute('style', 'border: 1px solid hsl(var(--border)); padding: 6px 8px;');
      }
    });

    table.removeAttribute('class');
    table.setAttribute('style', 'border-collapse: collapse; border: 1px solid hsl(var(--border)); width: auto;');
    table.setAttribute('border', '1');

    return `<div class="table-responsive" style="overflow-x: auto; margin: 8px 0;">${table.outerHTML}</div>`;
  };

  // Handle paste - strip formatting but preserve tables, images, and smart-distribute multiple options
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    // Smart paste: detect multiple options (a. b. c. d. e.) in pasted text
    if (onPasteMultipleOptions) {
      const plainText = e.clipboardData.getData('text/plain');
      const parsed = parseMultipleOptions(plainText);
      if (parsed && parsed.length >= 2) {
        e.preventDefault();
        onPasteMultipleOptions(parsed);
        return;
      }
    }

    // Check for image files in clipboard (screenshot, direct copy from browser/Word)
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
          alert('Ukuran gambar maksimal 5MB');
          return;
        }

        const formData = new FormData();
        formData.append('file', file);
        fetch('/api/upload', { method: 'POST', body: formData })
          .then(res => res.json())
          .then(data => {
            if (data.url && contentRef.current) {
              contentRef.current.focus();
              document.execCommand('insertHTML', false,
                `<img src="${data.url}" style="max-width: 100%; max-height: 250px; height: auto; border-radius: 4px; margin: 4px 0; object-fit: contain;" />`
              );
              handleInput();
            }
          })
          .catch(err => console.error('Paste image upload failed:', err));
        return;
      }
    }

    e.preventDefault();

    const htmlData = e.clipboardData.getData('text/html');

    if (htmlData) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlData, 'text/html');

      // Process images in HTML paste (from Word or browser)
      const images = doc.querySelectorAll('img');
      const tables = doc.querySelectorAll('table');

      if (images.length > 0 && tables.length === 0) {
        // HTML contains images — preserve them with clean styling
        let resultHtml = '';
        const body = doc.body;

        const processNode = (node: Node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as Element;
            if (el.tagName === 'IMG') {
              const src = el.getAttribute('src') || '';
              if (src) {
                resultHtml += `<img src="${src}" style="max-width: 100%; max-height: 250px; height: auto; border-radius: 4px; margin: 4px 0; object-fit: contain;" />`;
              }
            } else {
              // Process children for mixed text+image content
              const text = el.textContent?.trim();
              const childImages = el.querySelectorAll('img');
              if (childImages.length > 0) {
                el.childNodes.forEach(child => processNode(child));
              } else if (text) {
                resultHtml += text + '<br>';
              }
            }
          } else if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent?.trim();
            if (text) {
              resultHtml += text + '<br>';
            }
          }
        };

        body.childNodes.forEach(child => processNode(child));
        document.execCommand('insertHTML', false, resultHtml);
        handleInput();
        return;
      }

      if (tables.length > 0) {
        let resultHtml = '';
        const body = doc.body;
        const children = body.childNodes;

        children.forEach(child => {
          if (child.nodeType === Node.ELEMENT_NODE) {
            const el = child as Element;
            if (el.tagName === 'TABLE') {
              resultHtml += cleanTableHtml(el);
            } else {
              const nestedTable = el.querySelector('table');
              if (nestedTable) {
                resultHtml += cleanTableHtml(nestedTable);
              } else {
                const text = el.textContent?.trim();
                if (text) {
                  resultHtml += text + '<br>';
                }
              }
            }
          } else if (child.nodeType === Node.TEXT_NODE) {
            const text = child.textContent?.trim();
            if (text) {
              resultHtml += text + '<br>';
            }
          }
        });

        document.execCommand('insertHTML', false, resultHtml);
        handleInput();
        return;
      }
    }

    const text = e.clipboardData.getData('text/plain');
    const htmlText = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('<br>');

    document.execCommand('insertHTML', false, htmlText);
    handleInput();
  };

  const insertInlineTab = () => {
    execCmd('insertHTML', '&emsp;&emsp;');
  };

  const changeFontSize = (size: string) => {
    execCmd('fontSize', size);
  };

  const clearAllFormatting = () => {
    if (!contentRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      const plainText = contentRef.current.innerText;
      contentRef.current.innerHTML = plainText;
      onChange(plainText);
      return;
    }

    const range = selection.getRangeAt(0);

    if (range.collapsed) {
      const plainText = contentRef.current.innerText;
      contentRef.current.innerHTML = plainText;
      onChange(plainText);
    } else {
      const selectedText = range.toString();
      range.deleteContents();
      const textNode = document.createTextNode(selectedText);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
      handleInput();
    }

    contentRef.current.focus();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran gambar maksimal 5MB');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Upload gagal');
        return;
      }
      const data = await res.json();
      if (data.url) {
        execCmd('insertHTML', `<img src="${data.url}" style="max-width: 100%; max-height: 250px; height: auto; border-radius: 8px; margin: 8px 0; object-fit: contain;" />`);
        setShowImageDialog(false);
      }
    } catch (err) {
      console.error('Image upload failed:', err);
      alert('Gagal mengupload gambar. Periksa koneksi.');
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const insertImageFromUrl = () => {
    if (imageUrl) {
      execCmd('insertHTML', `<img src="${imageUrl}" style="max-width: 100%; max-height: 250px; height: auto; border-radius: 8px; margin: 8px 0; object-fit: contain;" />`);
      setImageUrl('');
      setShowImageDialog(false);
    }
  };

  const insertTable = () => {
    const rows = tableRows;
    const cols = tableCols;

    let tableHtml = `<div class="table-responsive" style="overflow-x: auto; margin: 8px 0;">
      <table border="1" style="width: auto; border-collapse: collapse; border: 1px solid hsl(var(--border)); font-size: inherit;">
        <tbody>`;

    for (let r = 0; r < rows; r++) {
      tableHtml += '<tr>';
      for (let c = 0; c < cols; c++) {
        tableHtml += `<td style="border: 1px solid hsl(var(--border)); padding: 6px 8px; min-width: 40px;">&nbsp;</td>`;
      }
      tableHtml += '</tr>';
    }

    tableHtml += `</tbody></table></div><br/>`;

    if (contentRef.current) {
      contentRef.current.focus();
    }

    document.execCommand('insertHTML', false, tableHtml);
    handleInput();

    setShowTableDialog(false);
    setTableRows(2);
    setTableCols(2);
  };

  const handleRowChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val >= 1 && val <= 20) {
      setTableRows(val);
    }
  };

  const handleColChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val >= 1 && val <= 10) {
      setTableCols(val);
    }
  };

  return (
    <div className="border border-input rounded-md overflow-hidden bg-background relative">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-muted/50 border-b flex-wrap">
        <Toggle size="sm" onClick={() => execCmd('bold')} aria-label="Bold">
          <Bold className="w-4 h-4" />
        </Toggle>
        <Toggle size="sm" onClick={() => execCmd('italic')} aria-label="Italic">
          <Italic className="w-4 h-4" />
        </Toggle>
        <Toggle size="sm" onClick={() => execCmd('underline')} aria-label="Underline">
          <Underline className="w-4 h-4" />
        </Toggle>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Font Size Dropdown */}
        <div className="flex items-center gap-1">
          <Type className="w-3 h-3 text-muted-foreground" />
          <Select onValueChange={changeFontSize}>
            <SelectTrigger className="w-[70px] h-8 text-xs">
              <SelectValue placeholder="Size" />
            </SelectTrigger>
            <SelectContent>
              {fontSizes.map(size => (
                <SelectItem key={size.value} value={size.value}>
                  {size.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Toggle size="sm" onClick={() => execCmd('subscript')} aria-label="Subscript" className="font-serif text-xs">
          x₂
        </Toggle>
        <Toggle size="sm" onClick={() => execCmd('superscript')} aria-label="Superscript" className="font-serif text-xs">
          x²
        </Toggle>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Text Alignment */}
        <Toggle size="sm" onClick={() => execCmd('justifyLeft')} aria-label="Align Left">
          <AlignLeft className="w-4 h-4" />
        </Toggle>
        <Toggle size="sm" onClick={() => execCmd('justifyCenter')} aria-label="Align Center">
          <AlignCenter className="w-4 h-4" />
        </Toggle>
        <Toggle size="sm" onClick={() => execCmd('justifyRight')} aria-label="Align Right">
          <AlignRight className="w-4 h-4" />
        </Toggle>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Indent/Outdent */}
        <Toggle size="sm" onClick={() => execCmd('indent')} aria-label="Indent">
          <IndentIncrease className="w-4 h-4" />
        </Toggle>
        <Toggle size="sm" onClick={() => execCmd('outdent')} aria-label="Outdent">
          <IndentDecrease className="w-4 h-4" />
        </Toggle>

        {/* Inline Tab */}
        <Toggle size="sm" onClick={insertInlineTab} aria-label="Insert Tab" className="font-mono text-xs font-bold">
          ⇥
        </Toggle>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Table button */}
        <Toggle size="sm" onClick={() => setShowTableDialog(true)} aria-label="Insert Table">
          <Table className="w-4 h-4" />
        </Toggle>

        {/* Image button */}
        <Toggle size="sm" onClick={() => setShowImageDialog(true)} aria-label="Insert Image">
          <ImageIcon className="w-4 h-4" />
        </Toggle>

        <div className="flex-1" />

        <Button variant="ghost" size="sm" onClick={clearAllFormatting} className="text-destructive hover:text-destructive hover:bg-destructive/10">
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Table Dialog */}
      <Dialog open={showTableDialog} onOpenChange={setShowTableDialog}>
        <DialogContent className="sm:max-w-[280px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Grid3X3 className="w-4 h-4" /> Insert Table
            </DialogTitle>
            <DialogDescription>Configure the table dimensions</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rows">Rows (1-20)</Label>
              <Input
                id="rows"
                type="number"
                min={1}
                max={20}
                value={tableRows}
                onChange={handleRowChange}
                className="text-center"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cols">Columns (1-10)</Label>
              <Input
                id="cols"
                type="number"
                min={1}
                max={10}
                value={tableCols}
                onChange={handleColChange}
                className="text-center"
              />
            </div>
          </div>
          <Button onClick={insertTable} className="w-full">
            Insert {tableRows}×{tableCols} Table
          </Button>
        </DialogContent>
      </Dialog>

      {/* Image Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Insert Image
            </DialogTitle>
            <DialogDescription>Upload from device or paste URL</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Upload from PC */}
            <div className="space-y-2">
              <Label>Upload from PC (max 5MB)</Label>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-dashed"
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose File
              </Button>
            </div>

            <div className="text-center text-xs text-muted-foreground">— or —</div>

            {/* URL input */}
            <div className="space-y-2">
              <Label>Image URL</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                />
                <Button onClick={insertImageFromUrl} disabled={!imageUrl} size="icon">
                  <Link className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Editor Area */}
      <div
        ref={contentRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        className="p-3 outline-none prose prose-sm dark:prose-invert max-w-none overflow-auto bg-background"
        style={{ minHeight: minHeight }}
        data-placeholder={placeholder}
      />

      {/* Hidden file input */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleImageUpload}
        className="hidden"
      />
    </div>
  );
};