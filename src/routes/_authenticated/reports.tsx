{/* Analysis & Recommendations */}
          {reportSections.analysis && (
            <section className="mt-8 break-inside-avoid rounded-xl border border-paper-border bg-paper-muted p-5">
              <h2 className="mb-3 font-black">
                التحليل المهني والتوصيات
              </h2>
              <p className="whitespace-pre-wrap text-sm leading-8">
                {reportNarrative.trim() ||
                  "لم يتم إدراج تحليل مهني أو توصيات إضافية."}
              </p>
            </section>
          )}

          {/* Signatures */}
          {reportSections.signatures && (
            <section className="mt-10 break-inside-avoid">
              <OfficialFooter school={school} />
            </section>
          )}
        </div>
      </div>

      {/* =========================================================
          SHARE DIALOG
      ========================================================= */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>مشاركة التقرير عبر واتساب</DialogTitle>
            <DialogDescription>
              أدخل رقم جوال ولي الأمر أو المسؤول (يبدأ بـ 05 أو 9665).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="mb-2 block text-xs font-bold">
                رقم الجوال
              </Label>
              <Input
                value={sharePhone}
                onChange={(e) => setSharePhone(e.target.value)}
                placeholder="05xxxxxxxx"
                className="h-11 rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShareOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              onClick={sharePdf}
              className="bg-[#25D366] text-white hover:bg-[#1da851] gap-2"
            >
              <Share2 className="size-4" /> مشاركة التقرير
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PrintStat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border border-paper-border bg-paper-muted p-3 text-center">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[280px] w-full flex-col items-center justify-center rounded-xl border border-dashed text-muted-foreground">
      <BarChart3 className="mb-2 size-8 opacity-40" />
      <p className="text-xs">لا توجد بيانات كافية لعرض الرسم البياني</p>
    </div>
  );
}
