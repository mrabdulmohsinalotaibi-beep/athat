-- Initiative template library for ATHAT.
alter table public.initiatives
  add column if not exists source_template_key text;

create table if not exists public.initiative_templates (
  key text primary key,
  title text not null,
  slogan text,
  category text not null,
  audience text,
  summary text not null,
  idea text,
  general_goal text,
  objectives jsonb not null default '[]'::jsonb,
  mechanism jsonb not null default '[]'::jsonb,
  expected_results jsonb not null default '[]'::jsonb,
  success_indicators text,
  default_role_title text not null default 'عضو المبادرة',
  default_tasks jsonb not null default '[]'::jsonb,
  recommended_weeks int,
  sort_order int not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.initiative_templates enable row level security;

drop policy if exists initiative_templates_read on public.initiative_templates;
create policy initiative_templates_read on public.initiative_templates
for select to authenticated using (active=true);

insert into public.initiative_templates(
  key,title,slogan,category,audience,summary,idea,general_goal,objectives,mechanism,expected_results,
  success_indicators,default_role_title,default_tasks,recommended_weeks,sort_order
) values
(
  'father-mentor',
  'مبادرة الأب الناصح',
  'قدوةٌ ترعى، ونصيحةٌ تبني.',
  'رعاية ومتابعة',
  'الطلاب المحتاجون إلى متابعة مستمرة',
  'توزيع الطلاب على معلمين يتابعون حضورهم وسلوكهم وواجباتهم ومستواهم الدراسي بصورة أبوية تربوية.',
  'تعزيز دور المعلم بوصفه قدوةً ومربيًا قريبًا من الطالب، يستمع إليه ويوجهه ويتابع تقدمه بالتعاون مع الأسرة والموجه الطلابي.',
  'بناء علاقة تربوية قائمة على الثقة والاحترام تسهم في الانضباط وتحسين الأداء السلوكي والدراسي والاجتماعي.',
  '["تعزيز انتظام الطلاب في الحضور والانصراف والالتزام بالحصص.","تنمية السلوك الإيجابي ومعالجة السلوكيات السلبية.","تحسين التحصيل الدراسي والالتزام بالواجبات.","تعزيز المسؤولية والثقة بالنفس واحترام الآخرين.","توثيق الشراكة بين المدرسة والأسرة."]'::jsonb,
  '["توزيع الطلاب على المعلمين المشاركين.","عقد لقاء تعريفي لبناء الثقة وتوضيح الأهداف.","متابعة الحضور والسلوك والواجبات والمستوى الدراسي.","تخصيص لقاء أسبوعي قصير للنصح والتحفيز.","التنسيق مع الأسرة والموجه الطلابي عند الحاجة.","توثيق التقدم ومراجعة النتائج شهريًا."]'::jsonb,
  '["ارتفاع مستوى الانضباط وانخفاض الغياب والتأخر.","تحسن السلوك والتحصيل الدراسي.","زيادة شعور الطالب بالاهتمام والانتماء.","تعزيز التزام الطلاب بواجباتهم ومسؤولياتهم."]'::jsonb,
  'مقارنة الغياب والتأخر والمخالفات السلوكية وإنجاز الواجبات ونتائج الطلاب قبل المبادرة وبعدها، مع استطلاع رضا الطلاب وأولياء الأمور.',
  'الأب الناصح',
  '["متابعة مجموعة الطلاب المسندة","لقاء أسبوعي قصير مع الطلاب","متابعة الحضور والتأخر والسلوك والواجبات","التواصل مع الأسرة عند الحاجة","رفع ملخص متابعة شهري"]'::jsonb,
  12,10
),
(
  'attendance-matters',
  'مبادرة حضورك يصنع الفرق',
  'كل يوم حضور… خطوة نحو النجاح.',
  'مواظبة وانضباط',
  'الطلاب المتكرر غيابهم أو تأخرهم',
  'تدخل مبكر ومتابعة منظمة للغياب والتأخر مع الطالب والأسرة، وقياس التحسن أسبوعيًا.',
  'مبادرة مركزة لخفض الغياب والتأخر الصباحي من خلال تحديد الطلاب الأكثر احتياجًا، إسنادهم لمتابعين، والتواصل المبكر مع الأسرة.',
  'رفع الانتظام المدرسي وتقليل الغياب والتأخر بما يدعم التحصيل والانضباط.',
  '["خفض معدل الغياب غير المبرر.","خفض التأخر الصباحي.","رفع وعي الطالب بأثر الانتظام على التحصيل.","تعزيز التعاون مع الأسرة في معالجة أسباب الغياب.","التدخل المبكر قبل تحول الغياب إلى نمط مزمن."]'::jsonb,
  '["استخراج الطلاب الأكثر غيابًا أو تأخرًا.","توزيع الحالات على أعضاء الفريق.","لقاء الطالب وتحديد الأسباب.","وضع هدف أسبوعي واضح للحضور.","التواصل مع الأسرة عند الحاجة.","مراجعة الحضور أسبوعيًا وتوثيق التحسن.","تكريم التحسن المستمر."]'::jsonb,
  '["تحسن نسبة الحضور.","انخفاض حالات التأخر.","انخفاض تكرار الغياب لدى الفئة المستهدفة.","ارتفاع تجاوب الأسرة والطالب."]'::jsonb,
  'نسبة الغياب والتأخر قبل/بعد، عدد الأيام المنتظمة المتتالية، عدد حالات التواصل الأسري، ونسبة الطلاب الذين حققوا هدف الانتظام.',
  'متابع المواظبة',
  '["متابعة الحضور يوميًا","تسجيل التأخر والغياب","لقاء الطالب عند التكرار","التواصل مع الأسرة","رفع ملخص أسبوعي للتحسن"]'::jsonb,
  8,20
),
(
  'irtiqaa',
  'مبادرة ارتقاء',
  'نتابع اليوم… ليرتقي مستواك غدًا.',
  'تحصيل دراسي',
  'الطلاب منخفضو التحصيل أو المتعثرون',
  'خطة متابعة للطلاب منخفضي التحصيل تربط المواد المتعثرة بالواجبات والدعم والمتابعة الأسرية والقياس الدوري.',
  'تقديم دعم منظم للطالب المتعثر أكاديميًا من خلال تشخيص مجالات الضعف، خطة تحسين قصيرة، ومتابعة أداء الطالب مع المعلمين والأسرة.',
  'رفع مستوى التحصيل وتقليل التعثر الدراسي عبر تدخل مبكر قابل للقياس.',
  '["تحديد المواد ومجالات الضعف بدقة.","رفع الالتزام بالواجبات والمهام العلاجية.","تعزيز مهارات الدراسة وتنظيم الوقت.","تفعيل دور المعلم والأسرة في خطة التحسين.","قياس تقدم الطالب بصورة دورية."]'::jsonb,
  '["تحديد الطلاب المستهدفين بناءً على النتائج والملاحظات.","تحديد المواد المتعثرة لكل طالب.","وضع هدف تحسن واقعي ومحدد.","إسناد متابع للطالب.","متابعة الواجبات والخطة العلاجية أسبوعيًا.","التنسيق مع معلمي المواد والأسرة.","مقارنة النتائج دوريًا وتحديث الخطة."]'::jsonb,
  '["تحسن الدرجات في المواد المستهدفة.","ارتفاع إنجاز الواجبات.","انخفاض عدد المواد المتعثرة.","تحسن عادات الدراسة والثقة الأكاديمية."]'::jsonb,
  'متوسط الدرجات قبل/بعد، عدد المواد المتعثرة، نسبة الواجبات المنجزة، انتظام الطالب في الخطة العلاجية، وتقدير المعلم للتحسن.',
  'متابع التحصيل',
  '["متابعة الطالب أكاديميًا","التنسيق مع معلمي المواد","متابعة الواجبات والخطة العلاجية","التواصل مع الأسرة","رفع قياس تقدم دوري"]'::jsonb,
  10,30
),
(
  'positive-behavior',
  'مبادرة سلوك إيجابي',
  'السلوك الحسن يُرى ويُعزَّز.',
  'سلوك وقيم',
  'جميع الطلاب مع تركيز على المحتاجين للتعزيز',
  'نظام متابعة وتحفيز يركز على السلوك الإيجابي مثل الاحترام والتعاون والمسؤولية والانضباط.',
  'نقل المتابعة السلوكية من التركيز على المخالفة فقط إلى رصد السلوك الإيجابي وتعزيزه، مع معالجة السلوك السلبي تربويًا.',
  'بناء بيئة مدرسية تعزز السلوك الإيجابي والمسؤولية والاحترام.',
  '["زيادة تكرار السلوكيات الإيجابية.","خفض المخالفات السلوكية المتكررة.","تعزيز الاحترام والتعاون والمسؤولية.","رفع دافعية الطالب للتحسن السلوكي.","إشراك المعلمين والأسرة في التعزيز."]'::jsonb,
  '["تحديد السلوكيات المستهدفة بوضوح.","رصد السلوك الإيجابي بصورة مستمرة.","منح تعزيزات معنوية مناسبة.","وضع خطة قصيرة للطلاب ذوي السلوك المتكرر.","إشراك الأسرة عند الحاجة.","مراجعة النتائج شهريًا وإبراز قصص التحسن."]'::jsonb,
  '["ارتفاع السلوكيات الإيجابية المرصودة.","انخفاض المخالفات المتكررة.","تحسن التفاعل بين الطلاب والمعلمين.","زيادة شعور الطالب بالتقدير والانتماء."]'::jsonb,
  'عدد السلوكيات الإيجابية المرصودة، انخفاض المخالفات قبل/بعد، نسبة الطلاب المتحسنين، واستطلاع المناخ السلوكي.',
  'سفير السلوك الإيجابي',
  '["رصد السلوك الإيجابي","تعزيز الطلاب وتحفيزهم","متابعة الحالات المتكررة","التواصل مع الأسرة عند الحاجة","رفع ملخص شهري"]'::jsonb,
  10,40
),
(
  'parent-partner',
  'مبادرة شريكنا ولي الأمر',
  'شراكة أقوى… أثر أكبر.',
  'شراكة أسرية',
  'أولياء الأمور والطلاب المستهدفون',
  'مسار منظم للتواصل مع الأسرة وإطلاعها على تقدم الطالب ومشاركتها في الحلول والمتابعة.',
  'تعزيز الشراكة الحقيقية بين المدرسة والأسرة من خلال تواصل مختصر ومنظم، تقارير تقدم، لقاءات عند الحاجة، وقياس رضا ولي الأمر.',
  'رفع جودة التواصل الأسري وتحويل ولي الأمر إلى شريك فعّال في دعم الطالب.',
  '["رفع انتظام التواصل مع أولياء الأمور.","تحسين سرعة الاستجابة للحالات التي تحتاج تدخلًا.","توحيد الرسائل والمتابعة بين المدرسة والأسرة.","رفع رضا ولي الأمر عن التواصل.","زيادة مشاركة الأسرة في خطط التحسين."]'::jsonb,
  '["تحديد الطلاب أو الموضوعات ذات الأولوية.","تحديد مسؤول التواصل لكل مجموعة.","إرسال تحديثات مختصرة ومنظمة.","توثيق الاطلاع والاستجابة.","عقد لقاءات عند الحاجة.","قياس رضا ولي الأمر دوريًا.","رفع تقرير شهري بمستوى التفاعل والنتائج."]'::jsonb,
  '["ارتفاع نسبة تجاوب أولياء الأمور.","تحسن انتظام الطلاب المستهدفين.","سرعة معالجة المشكلات المشتركة.","ارتفاع رضا الأسرة عن التواصل المدرسي."]'::jsonb,
  'نسبة الرسائل التي تم الاطلاع عليها، معدل تجاوب الأسرة، عدد اللقاءات، نسبة تنفيذ الإجراءات المشتركة، ورضا أولياء الأمور.',
  'منسق الشراكة الأسرية',
  '["التواصل الدوري مع أولياء الأمور","توثيق الاستجابة والمتابعة","تنسيق اللقاءات عند الحاجة","متابعة الإجراءات المشتركة","رفع تقرير شهري"]'::jsonb,
  8,50
)
on conflict(key) do update set
  title=excluded.title,
  slogan=excluded.slogan,
  category=excluded.category,
  audience=excluded.audience,
  summary=excluded.summary,
  idea=excluded.idea,
  general_goal=excluded.general_goal,
  objectives=excluded.objectives,
  mechanism=excluded.mechanism,
  expected_results=excluded.expected_results,
  success_indicators=excluded.success_indicators,
  default_role_title=excluded.default_role_title,
  default_tasks=excluded.default_tasks,
  recommended_weeks=excluded.recommended_weeks,
  sort_order=excluded.sort_order,
  active=true,
  updated_at=now();

create or replace function public.get_initiative_templates()
returns jsonb
language sql
stable
security definer
set search_path=public,pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'key',t.key,
    'title',t.title,
    'slogan',t.slogan,
    'category',t.category,
    'audience',t.audience,
    'summary',t.summary,
    'idea',t.idea,
    'general_goal',t.general_goal,
    'objectives',t.objectives,
    'mechanism',t.mechanism,
    'expected_results',t.expected_results,
    'success_indicators',t.success_indicators,
    'default_role_title',t.default_role_title,
    'default_tasks',t.default_tasks,
    'recommended_weeks',t.recommended_weeks
  ) order by t.sort_order,t.title),'[]'::jsonb)
  from public.initiative_templates t
  where t.active=true;
$$;

create or replace function public.activate_initiative_template(p_template_key text)
returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  t public.initiative_templates%rowtype;
  sid uuid;
  iid uuid;
begin
  if auth.uid() is null then raise exception 'يجب تسجيل الدخول'; end if;

  select * into t from public.initiative_templates
  where key=p_template_key and active=true;
  if t.key is null then raise exception 'قالب المبادرة غير موجود'; end if;

  select school_id into sid
  from public.school_members
  where user_id=auth.uid() and member_status='active'
  order by is_admin desc,created_at
  limit 1;
  if sid is null then raise exception 'الحساب غير مرتبط بمدرسة فعالة'; end if;

  if exists(
    select 1 from public.initiatives
    where school_id=sid and source_template_key=t.key and status in ('draft','active')
  ) then
    raise exception 'هذه المبادرة مفعلة بالفعل في المدرسة';
  end if;

  iid:=public.create_initiative(
    t.title,t.slogan,t.idea,t.general_goal,t.objectives,t.mechanism,t.expected_results,
    t.success_indicators,current_date,
    case when t.recommended_weeks is null then null else current_date+(t.recommended_weeks*7) end
  );

  update public.initiatives
  set source_template_key=t.key
  where id=iid;

  return iid;
end $$;

revoke all on function public.get_initiative_templates() from public;
revoke all on function public.activate_initiative_template(text) from public;
grant execute on function public.get_initiative_templates() to authenticated;
grant execute on function public.activate_initiative_template(text) to authenticated;
