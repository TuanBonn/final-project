// // src/components/FilterSidebar.tsx
// "use client";

// import { useState, useEffect } from "react";
// import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
// import { Checkbox } from "@/components/ui/checkbox";
// import { Label } from "@/components/ui/label";
// import { Separator } from "@/components/ui/separator";
// import { ScrollArea } from "@/components/ui/scroll-area";
// import { CheckCircle, Loader2 } from "lucide-react";

// interface Brand {
//   id: string;
//   name: string;
// }

// interface FilterSidebarProps {
//   sort: string;
//   setSort: (value: string) => void;
//   filterVerified: boolean;
//   setFilterVerified: (value: boolean) => void;
//   filterConditions: string[];
//   setFilterConditions: (conditions: string[]) => void;
//   filterBrands: string[]; // array brand_id
//   setFilterBrands: (brands: string[]) => void;
// }

// const ALL_CONDITIONS = [
//   { id: "new", label: "Mới (New)" },
//   { id: "used", label: "Đã sử dụng (Used)" },
//   { id: "like_new", label: "Như mới (Like New)" },
//   { id: "custom", label: "Hàng độ (Custom)" },
// ];

// export function FilterSidebar({
//   sort,
//   setSort,
//   filterVerified,
//   setFilterVerified,
//   filterConditions,
//   setFilterConditions,
//   filterBrands,
//   setFilterBrands,
// }: FilterSidebarProps) {
//   const [brands, setBrands] = useState<Brand[]>([]);
//   const [loadingBrands, setLoadingBrands] = useState(true);

//   useEffect(() => {
//     const fetchBrands = async () => {
//       try {
//         setLoadingBrands(true);
//         const res = await fetch("/api/admin/brands");
//         if (!res.ok) throw new Error("Failed to fetch brands");
//         const data = await res.json();
//         setBrands(data.brands || []);
//       } catch (error) {
//         console.error(error);
//       } finally {
//         setLoadingBrands(false);
//       }
//     };
//     fetchBrands();
//   }, []);

//   const handleCheckedChange = (
//     checked: boolean,
//     value: string,
//     currentValues: string[],
//     setter: (values: string[]) => void
//   ) => {
//     if (checked) setter([...currentValues, value]);
//     else setter(currentValues.filter((v) => v !== value));
//   };

//   return (
//     <aside className="w-full lg:w-1/4 xl:w-1/5 space-y-6 p-4 border rounded-lg shadow-sm h-fit sticky top-24">
//       {/* Sắp xếp */}
//       <div>
//         <h3 className="font-semibold mb-3 text-lg">Sắp xếp</h3>
//         <RadioGroup value={sort} onValueChange={setSort}>
//           <div className="flex items-center space-x-2">
//             <RadioGroupItem value="created_at_desc" id="sort-newest" />
//             <Label htmlFor="sort-newest">Mới nhất</Label>
//           </div>
//           <div className="flex items-center space-x-2">
//             <RadioGroupItem value="price_asc" id="sort-price-asc" />
//             <Label htmlFor="sort-price-asc">Giá: Thấp đến Cao</Label>
//           </div>
//           <div className="flex items-center space-x-2">
//             <RadioGroupItem value="price_desc" id="sort-price-desc" />
//             <Label htmlFor="sort-price-desc">Giá: Cao đến Thấp</Label>
//           </div>
//         </RadioGroup>
//       </div>

//       <Separator />

//       {/* Lọc chung */}
//       <div>
//         <h3 className="font-semibold mb-3 text-lg">Lọc</h3>
//         <div className="flex items-center space-x-2">
//           <Checkbox
//             id="filter-verified"
//             checked={filterVerified}
//             onCheckedChange={(checked) => setFilterVerified(checked === true)}
//           />
//           <Label
//             htmlFor="filter-verified"
//             className="flex items-center gap-1.5"
//           >
//             Chỉ hiển thị người bán Verified
//             <CheckCircle className="h-4 w-4 text-green-600" />
//           </Label>
//         </div>
//       </div>

//       <Separator />

//       {/* Lọc theo tình trạng */}
//       <div>
//         <h3 className="font-semibold mb-3">Tình trạng</h3>
//         <div className="space-y-2">
//           {ALL_CONDITIONS.map((cond) => (
//             <div key={cond.id} className="flex items-center space-x-2">
//               <Checkbox
//                 id={`cond-${cond.id}`}
//                 checked={filterConditions.includes(cond.id)}
//                 onCheckedChange={(checked) =>
//                   handleCheckedChange(
//                     checked === true,
//                     cond.id,
//                     filterConditions,
//                     setFilterConditions
//                   )
//                 }
//               />
//               <Label htmlFor={`cond-${cond.id}`}>{cond.label}</Label>
//             </div>
//           ))}
//         </div>
//       </div>

//       <Separator />

//       {/* Lọc theo Hãng (brand_id) */}
//       <div>
//         <h3 className="font-semibold mb-3">Hãng xe</h3>
//         <ScrollArea className="h-60 w-full rounded-md border p-4">
//           {loadingBrands ? (
//             <div className="flex items-center justify-center h-full">
//               <Loader2 className="h-5 w-5 animate-spin" />
//             </div>
//           ) : (
//             <div className="space-y-2">
//               {brands.map((brand) => (
//                 <div key={brand.id} className="flex items-center space-x-2">
//                   <Checkbox
//                     id={`brand-${brand.id}`}
//                     checked={filterBrands.includes(brand.id)}
//                     onCheckedChange={(checked) =>
//                       handleCheckedChange(
//                         checked === true,
//                         brand.id, // gửi id
//                         filterBrands,
//                         setFilterBrands
//                       )
//                     }
//                   />
//                   <Label htmlFor={`brand-${brand.id}`}>{brand.name}</Label>
//                 </div>
//               ))}
//             </div>
//           )}
//         </ScrollArea>
//       </div>
//     </aside>
//   );
// }

// src/components/FilterSidebar.tsx
"use client";

import { useState, useEffect } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, Loader2 } from "lucide-react";
// === 1. IMPORT PRISMA ===
import { Brand } from "@prisma/client";
// =====================

interface FilterSidebarProps {
  sort: string;
  setSort: (value: string) => void;
  filterVerified: boolean;
  setFilterVerified: (value: boolean) => void;
  filterConditions: string[];
  setFilterConditions: (conditions: string[]) => void;
  filterBrands: string[]; // array brand_id
  setFilterBrands: (brands: string[]) => void;
}

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
  // === 2. SỬ DỤNG TYPE CỦA PRISMA ===
  const [brands, setBrands] = useState<Brand[]>([]);
  // ==================================
  const [loadingBrands, setLoadingBrands] = useState(true);

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        setLoadingBrands(true);
        const res = await fetch("/api/admin/brands");
        if (!res.ok) throw new Error("Failed to fetch brands");
        const data = await res.json();
        setBrands(data.brands || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingBrands(false);
      }
    };
    fetchBrands();
  }, []);

  const handleCheckedChange = (
    checked: boolean,
    value: string,
    currentValues: string[],
    setter: (values: string[]) => void
  ) => {
    if (checked) setter([...currentValues, value]);
    else setter(currentValues.filter((v) => v !== value));
  };

  return (
    <aside className="w-full lg:w-1/4 xl:w-1/5 space-y-6 p-4 border rounded-lg shadow-sm h-fit sticky top-24">
      {/* Sắp xếp */}
      <div>
        <h3 className="font-semibold mb-3 text-lg">Sắp xếp</h3>
        <RadioGroup value={sort} onValueChange={setSort}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="created_at_desc" id="sort-newest" />
            <Label htmlFor="sort-newest">Mới nhất</Label>
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
            className="flex items-center gap-1.5"
          >
            Chỉ hiển thị người bán Verified
            <CheckCircle className="h-4 w-4 text-green-600" />
          </Label>
        </div>
      </div>

      <Separator />

      {/* Lọc theo tình trạng */}
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

      {/* Lọc theo Hãng (brand_id) */}
      <div>
        <h3 className="font-semibold mb-3">Hãng xe</h3>
        <ScrollArea className="h-60 w-full rounded-md border p-4">
          {loadingBrands ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {brands.map((brand) => (
                <div key={brand.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`brand-${brand.id}`}
                    checked={filterBrands.includes(brand.id)}
                    onCheckedChange={(checked) =>
                      handleCheckedChange(
                        checked === true,
                        brand.id, // gửi id
                        filterBrands,
                        setFilterBrands
                      )
                    }
                  />
                  <Label htmlFor={`brand-${brand.id}`}>{brand.name}</Label>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </aside>
  );
}
