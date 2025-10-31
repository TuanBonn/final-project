// src/components/FilterSidebar.tsx
"use client";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

// Props nhận từ page.tsx
interface FilterSidebarProps {
  sort: string;
  setSort: (value: string) => void;
  filterVerified: boolean;
  setFilterVerified: (checked: boolean) => void;
  filterConditions: string[];
  setFilterConditions: (conditions: string[]) => void;
  filterBrands: string[];
  setFilterBrands: (brands: string[]) => void;
}

// Dữ liệu filter (sau này có thể fetch từ API)
const ALL_BRANDS = ["Tomica", "Hotwheels", "MiniGT", "Inno64", "Kyosho"];
const ALL_CONDITIONS = [
  { id: "new", label: "Mới (New)" },
  { id: "used", label: "Đã sử dụng (Used)" },
  { id: "like_new", label: "Như mới (Like New)" },
  { id: "custom", label: "Hàng độ (Custom)" },
];

export function FilterSidebar({
  sort,
  setSort,
  filterVerified,
  setFilterVerified,
  filterConditions,
  setFilterConditions,
  filterBrands,
  setFilterBrands,
}: FilterSidebarProps) {
  // Hàm xử lý check/uncheck (cho mảng)
  const handleCheckedChange = (
    checked: boolean,
    value: string,
    currentValues: string[],
    setter: (values: string[]) => void
  ) => {
    if (checked) {
      setter([...currentValues, value]); // Thêm vào mảng
    } else {
      setter(currentValues.filter((v) => v !== value)); // Lọc bỏ khỏi mảng
    }
  };

  return (
    <aside className="w-full lg:w-1/4 xl:w-1/5 space-y-6 p-4 border rounded-lg shadow-sm h-fit sticky top-24">
      {/* Sắp xếp (ĐÃ SỬA LẠI) */}
      <div>
        <h3 className="font-semibold mb-3 text-lg">Sắp xếp</h3>
        <RadioGroup value={sort} onValueChange={setSort}>
          {/* Mặc định là 'created_at_desc' */}
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="created_at_desc" id="sort-newest" />
            <Label htmlFor="sort-newest">Mới nhất</Label>
          </div>
          {/* Thêm lựa chọn 'verified_first' */}
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="verified_first" id="sort-verified" />
            <Label htmlFor="sort-verified">Ưu tiên Verified</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="price_asc" id="sort-price-asc" />
            <Label htmlFor="sort-price-asc">Giá: Thấp đến Cao</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="price_desc" id="sort-price-desc" />
            <Label htmlFor="sort-price-desc">Giá: Cao đến Thấp</Label>
          </div>
        </RadioGroup>
      </div>

      <Separator />

      {/* Lọc chung */}
      <div>
        <h3 className="font-semibold mb-3 text-lg">Lọc</h3>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="filter-verified"
            checked={filterVerified}
            onCheckedChange={(checked) => setFilterVerified(checked === true)}
          />
          <Label
            htmlFor="filter-verified"
            className="font-medium text-green-600"
          >
            Chỉ hiển thị người bán Verified
          </Label>
        </div>
      </div>

      <Separator />

      {/* Lọc theo Tình trạng */}
      <div>
        <h3 className="font-semibold mb-3">Tình trạng</h3>
        <div className="space-y-2">
          {ALL_CONDITIONS.map((cond) => (
            <div key={cond.id} className="flex items-center space-x-2">
              <Checkbox
                id={`cond-${cond.id}`}
                checked={filterConditions.includes(cond.id)}
                onCheckedChange={(checked) =>
                  handleCheckedChange(
                    checked === true,
                    cond.id,
                    filterConditions,
                    setFilterConditions
                  )
                }
              />
              <Label htmlFor={`cond-${cond.id}`}>{cond.label}</Label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Lọc theo Hãng */}
      <div>
        <h3 className="font-semibold mb-3">Hãng xe</h3>
        <div className="space-y-2">
          {ALL_BRANDS.map((brand) => (
            <div key={brand} className="flex items-center space-x-2">
              <Checkbox
                id={`brand-${brand}`}
                checked={filterBrands.includes(brand)}
                onCheckedChange={(checked) =>
                  handleCheckedChange(
                    checked === true,
                    brand,
                    filterBrands,
                    setFilterBrands
                  )
                }
              />
              <Label htmlFor={`brand-${brand}`}>{brand}</Label>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
