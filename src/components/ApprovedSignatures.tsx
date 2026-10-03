import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

type SignatureRow = {
  id: string;
  signer_name: string;
  signer_role: string;
  signature_data: string | null;
  signed_at: string | null;
  read_confirmed?: boolean | null;
  read_confirmed_at?: string | null;
};

export function ApprovedSignatures({
  recordTable,
  recordId,
  className = "",
}: {
  recordTable: string;
  recordId?: string | null;
  className?: string;
}) {
  const { data = [] } = useQuery({
    queryKey: ["approved-signatures", recordTable, recordId],
    enabled: Boolean(recordId),
    refetchInterval: 10_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("document_signature_requests")
        .select("id,signer_name,signer_role,signature_data,signed_at,read_confirmed,read_confirmed_at,status")
        .eq("record_table", recordTable)
        .eq("record_id", recordId)
        .eq("status", "signed")
        .order("signed_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SignatureRow[];
    },
  });

  const signed = data.filter((item) => item.signature_data);
  if (!signed.length) return null;

  return (
    <section data-pdf-block="true" className={`mt-6 border-t border-[var(--paper-border,#ddd6cc)] pt-4 ${className}`}>
      <p className="mb-3 text-xs font-black text-[var(--paper-muted-foreground,#6b625a)]">
        الاعتمادات والتواقيع الإلكترونية
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {signed.map((item) => (
          <div key={item.id} className="break-inside-avoid rounded-lg border border-[var(--paper-border,#ddd6cc)] p-3">
            <p className="text-xs font-black">{item.signer_name}</p>
            <p className="text-[10px] text-[var(--paper-muted-foreground,#6b625a)]">{item.signer_role}</p>
            <img
              src={item.signature_data ?? ""}
              alt={`توقيع ${item.signer_name}`}
              className="mt-2 h-16 max-w-[180px] object-contain"
            />
            {item.signed_at && (
              <p className="mt-1 text-[9px] text-[var(--paper-muted-foreground,#6b625a)]">
                تم التوقيع: {new Date(item.signed_at).toLocaleString("ar-SA")}
              </p>
            )}
            {item.read_confirmed && (
              <p className="mt-1 text-[9px] text-[var(--paper-muted-foreground,#6b625a)]">
                تم تسجيل إقرار القراءة
                {item.read_confirmed_at
                  ? ` · ${new Date(item.read_confirmed_at).toLocaleString("ar-SA")}`
                  : ""}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
