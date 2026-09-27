{/* KPIs */}

          {reportSections.kpis &&
            kpis.length > 0 && (
              <section className="mt-7 break-inside-avoid">
                <h2 className="mb-3 border-r-4 border-primary pr-3 text-base font-black">
                  مؤشرات الأداء (KPIs)
                </h2>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {kpis.map((kpi, idx) => {
                    const isPercent = isPercentKpi(kpi.key);
                    const formattedVal = isPercent
                      ? `${kpi.value}%`
                      : kpi.value;
                    return (
                      <div
                        key={idx}
                        className="rounded-xl border border-paper-border bg-paper-muted p-3.5 text-right"
                      >
                        <p className="text-xs text-muted-foreground">
                          {kpi.title}
                        </p>
                        <p className="mt-1 text-xl font-black text-primary">
                          {formattedVal}
                        </p>
                        {kpi.description && (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {kpi.description}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

          {/* Record Details */}

          {reportSections.details &&
            selected.map((key) => {
              const config = recordByKey(key);
              const rows = sections?.[key] ?? [];

              return (
                <section key={key} className="mt-8">
                  <h2 className="mb-3 border-r-4 border-primary pr-3 text-base font-black">
                    سجل: {config.title} ({rows.length})
                  </h2>

                  {rows.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-right text-xs">
                        <thead>
                          <tr className="bg-paper-muted">
                            {config.columns.map((col) => (
                              <th
                                key={col.key}
                                className="border border-paper-border p-2 font-bold"
                              >
                                {col.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, index) => (
                            <tr key={index} className="border-b border-paper-border">
                              {config.columns.map((col) => {
                                const val = row[col.key];
                                return (
                                  <td
                                    key={col.key}
                                    className="border border-paper-border p-2 align-top text-xs"
                                  >
                                    {displayRecordValue(val, col.type)}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="rounded-xl border border-dashed border-paper-border p-4 text-center text-xs text-muted-foreground">
                      لا توجد سجلات مطابقة للفترة المحددة.
                    </p>
                  )}
                </section>
              );
            })}

          {/* Evidence section */}

          {reportSections.evidence &&
            totalEvidence > 0 && (
              <section className="mt-8 break-inside-avoid">
                <h2 className="mb-3 border-r-4 border-primary pr-3 text-base font-black">
                  الشواهد والصور المرفقة ({totalEvidence})
                </h2>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {(sections?.["evidences"] ?? []).map((row, index) => {
                    const preview = String(row["preview_url"] ?? "");
                    const title = String(row["title"] ?? `شاهد ${index + 1}`);
                    if (!preview) return null;

                    return (
                      <div
                        key={index}
                        className="overflow-hidden rounded-xl border border-paper-border bg-paper-muted p-2 text-center"
                      >
                        <div className="aspect-video w-full overflow-hidden rounded-lg bg-background">
                          <img
                            src={preview}
                            alt={title}
                            className="size-full object-cover"
                          />
                        </div>
                        <p className="mt-1.5 truncate text-[11px] font-bold">
                          {title}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

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
