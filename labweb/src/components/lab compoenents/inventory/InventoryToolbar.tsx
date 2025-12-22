import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, RefreshCw } from "lucide-react";

interface Props {
  onRefresh: () => void;
  onExport: () => void;
  search?: string;
  onSearch?: (v: string) => void;
  showSearch?: boolean;
}

const InventoryToolbar: React.FC<Props> = ({ onRefresh, onExport, search = "", onSearch, showSearch = true }) => {
  return (
    <div className="flex items-center gap-2 w-full">
      {showSearch && (
        <div className="relative flex-1 max-w-md">
          <Input placeholder="Search items..." value={search} onChange={e=> onSearch && onSearch(e.target.value)} />
        </div>
      )}
      <Button
        onClick={onRefresh}
        className="flex items-center justify-center bg-blue-800 text-white hover:bg-blue-900"
        size="icon"
        aria-label="Refresh inventory"
      >
        <RefreshCw className="w-4 h-4" />
      </Button>
      <Button onClick={onExport} className="flex items-center gap-2 bg-blue-800 text-white hover:bg-blue-900">
        <Download className="w-4 h-4" /> Export CSV
      </Button>
    </div>
  );
};

export default InventoryToolbar;
