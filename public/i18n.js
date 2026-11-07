/* Языки сайта: русский (основной), арабский и турецкий.
   Ключ словаря это русский текст как он стоит в разметке, значение пара
   [арабский, турецкий]. Так в HTML ничего не размечено: скрипт находит
   текст по совпадению и подменяет его, а оригинал помнит и возвращает.
   В шаблонах {имя} подставляется значение из vars.
   Текст, который рисует сам скрипт страницы, берёт перевод через window.t().
   Блок с атрибутом data-js скрипт страницы перерисовывает сам, data-no-i18n
   не трогается вообще. */
(function () {
  'use strict';

  var LANGS = {
    ru: { dir: 'ltr', tag: 'RU', name: 'Русский' },
    ar: { dir: 'rtl', tag: 'AR', name: 'العربية' },
    tr: { dir: 'ltr', tag: 'TR', name: 'Türkçe' }
  };
  var IDX = { ar: 0, tr: 1 };
  var KEY = 'tochka-lang';

  var D = {
    /* ---------- шапка, первый экран ---------- */
    'Перейти к заявке на замер': ['انتقل إلى طلب القياس', 'Ölçü talebine geç'],
    'Точка уюта. Мебель из МДФ на заказ': ['نقطة الراحة. أثاث MDF حسب الطلب', 'Konfor Noktası. Ölçüye özel MDF mobilya'],
    'Кухни, шкафы, полки и столы из панелей МДФ под ваш проём. Идлиб-Фуа, собственное производство, изготовление от 3 до 5 дней.': [
      'مطابخ وخزائن ورفوف وطاولات من ألواح MDF على مقاس فتحتك. إدلب - الفوعة، تصنيع في ورشتنا، مدة التنفيذ من 3 إلى 5 أيام.',
      'Ölçünüze göre MDF panelden mutfak, dolap, raf ve masa. İdlib-Fua, kendi atölyemizde üretim, 3 ila 5 günde teslim.'],
    'Точка уюта, на главную': ['نقطة الراحة، الصفحة الرئيسية', 'Konfor Noktası, ana sayfa'],
    'Разделы': ['الأقسام', 'Bölümler'],
    'Что делаем': ['ماذا نصنع', 'Ne yapıyoruz'],
    'Производство': ['الإنتاج', 'Üretim'],
    'Сроки': ['المدة', 'Süre'],
    'Работы': ['أعمالنا', 'Çalışmalar'],
    'Конструктор': ['المصمّم', 'Tasarla'],
    'Замер': ['القياس', 'Ölçü'],
    'Язык': ['اللغة', 'Dil'],

    'Чертёж кухонного гарнитура с проставленными размерами': ['مخطط مطبخ مع الأبعاد', 'Ölçüleri işlenmiş mutfak takımı çizimi'],
    'Мебель по размеру': ['أثاث على مقاس', 'Boşluğunuzun ölçüsüne'],
    'вашего проёма': ['فتحتك بالضبط', 'göre mobilya'],
    'Кухни, шкафы, полки и столы из панелей МДФ. Считаем по факту замера, а не по каталогу готовых размеров.': [
      'مطابخ وخزائن ورفوف وطاولات من ألواح MDF. نحسب بناءً على القياس الفعلي، لا على كتالوج مقاسات جاهزة.',
      'MDF panelden mutfak, dolap, raf ve masa. Hazır ölçü kataloğuna göre değil, yerinde alınan ölçüye göre hesaplıyoruz.'],
    'Вызвать замерщика': ['اطلب زيارة القياس', 'Ölçü randevusu alın'],
    'Собрать в конструкторе': ['صمّم بنفسك', 'Kendiniz tasarlayın'],

    /* ---------- что делаем ---------- */
    'Схема кухонного гарнитура с габаритом по ширине': ['مخطط مطبخ مع العرض الإجمالي', 'Genişlik ölçüsüyle mutfak takımı şeması'],
    'Схема шкафа с габаритом по высоте': ['مخطط خزانة مع الارتفاع الإجمالي', 'Yükseklik ölçüsüyle dolap şeması'],
    'Схема навесных полок с габаритом по пролёту': ['مخطط رفوف معلّقة مع طول الامتداد', 'Açıklık ölçüsüyle asma raf şeması'],
    'Схема стола с габаритом по высоте': ['مخطط طاولة مع الارتفاع', 'Yükseklik ölçüsüyle masa şeması'],
    'Схема шведской стенки с турником и габаритом по высоте': ['مخطط جدار سويدي مع عقلة وارتفاعه', 'Barfiksli İsveç duvarı ve yükseklik ölçüsü şeması'],
    'Кухни': ['المطابخ', 'Mutfaklar'],
    'Прямые и угловые, с обходом труб, розеток и подоконника.': ['مستقيمة وزاوية، مع مراعاة الأنابيب والمقابس وعتبة النافذة.', 'Düz ve L şeklinde; boru, priz ve pencere denizliği çevresine uyumlu.'],
    'корпус 16 мм, фасад МДФ': ['هيكل 16 مم، واجهة MDF', 'gövde 16 mm, MDF kapak'],
    'Шкафы': ['الخزائن', 'Dolaplar'],
    'Распашные и купе, во всю высоту потолка, без антресольной щели.': ['أبواب مفصلية أو جرّارة، بكامل ارتفاع السقف، دون فراغ علوي.', 'Menteşeli ve sürgülü, tavana kadar, üstte boşluk bırakmadan.'],
    'глубина от 350 до 600': ['العمق من 350 إلى 600', 'derinlik 350 ile 600 arası'],
    'Полки': ['الرفوف', 'Raflar'],
    'Навесные и в нишу, с расчётом прогиба под длину пролёта.': ['معلّقة أو داخل تجويف، مع حساب الانحناء حسب طول الامتداد.', 'Duvara asılan veya niş içine, açıklık uzunluğuna göre sarkma hesaplı.'],
    'пролёт до 900': ['الامتداد حتى 900', "açıklık 900'e kadar"],
    'Столы': ['الطاولات', 'Masalar'],
    'Обеденные, письменные и подоконник-столешница.': ['طاولات طعام ومكاتب وسطح بدل عتبة النافذة.', 'Yemek masası, çalışma masası ve pencere denizliği tezgâhı.'],
    'кромка ПВХ 2 мм': ['حافة PVC بسماكة 2 مم', 'PVC kenar bandı 2 mm'],
    'Спорткомплексы': ['مجمعات رياضية', 'Spor köşeleri'],
    'Шведские стенки, турники и детские качели. Собираем и крепим на месте, в детской или в комнате.': [
      'جدران سويدية وعقل وأراجيح للأطفال. نركّبها ونثبّتها في المكان، في غرفة الأطفال أو أي غرفة.',
      'İsveç duvarları, barfikslar ve çocuk salıncakları. Yerinde monte eder ve sabitleriz; çocuk odasında veya salonda.'],
    'массив дерева, не МДФ': ['خشب طبيعي وليس MDF', 'masif ahşap, MDF değil'],
    'Размеры на схемах приведены как пример. Ваши считаются по замеру.': ['الأبعاد في المخططات للتوضيح فقط. أبعادك تُحسب بعد القياس.', 'Şemalardaki ölçüler örnektir. Sizinkiler ölçü alındıktan sonra hesaplanır.'],

    /* ---------- цех, сроки ---------- */
    'Между вами и цехом': ['بينك وبين الورشة', 'Sizinle atölye arasında'],
    'никого нет': ['لا أحد', 'kimse yok'],
    'Раскрой, кромление и сборка идут на собственном производстве. Поэтому размер меняется до раскроя, а не через посредника и две недели переписки.': [
      'القص ولصق الحواف والتجميع كلها في ورشتنا. لذلك يتغيّر المقاس قبل القص، لا عبر وسيط وأسبوعين من المراسلات.',
      'Kesim, kenar bantlama ve montaj kendi atölyemizde yapılır. Bu yüzden ölçü, aracı ve iki haftalık yazışma olmadan kesimden önce değişir.'],
    'ЗАМЕР': ['القياس', 'ÖLÇÜ'],
    'ЦЕХ': ['الورشة', 'ATÖLYE'],
    'Сколько это занимает': ['كم يستغرق ذلك', 'Ne kadar sürüyor'],
    'Проект': ['التصميم', 'Proje'],
    'Раскрой': ['القص', 'Kesim'],
    'Сборка': ['التجميع', 'Montaj'],
    'Установка': ['التركيب', 'Kurulum'],
    'Изготовление, от 3 до 5 дней': ['التصنيع، من 3 إلى 5 أيام', 'Üretim, 3 ila 5 gün'],
    'Срок считается на изготовление. Дату замера и установки согласуем по вашему графику.': [
      'المدة تخص التصنيع فقط. نحدد موعد القياس والتركيب بما يناسب جدولك.',
      'Süre yalnızca üretim içindir. Ölçü ve kurulum tarihini sizin programınıza göre belirleriz.'],

    /* ---------- работы ---------- */
    'Сделанное': ['ما أنجزناه', 'Yaptıklarımız'],
    'Кухня до работ: бетонная тумба без фасадов': ['المطبخ قبل العمل: قاعدة خرسانية بلا واجهات', 'İşten önce mutfak: kapaksız beton alt dolap'],
    'Собранные корпуса кухни перед установкой': ['هياكل المطبخ بعد التجميع قبل التركيب', 'Kurulumdan önce monte edilmiş mutfak gövdeleri'],
    'Готовая угловая кухня с гранитной столешницей': ['مطبخ زاوية جاهز بسطح غرانيت', 'Granit tezgâhlı, tamamlanmış köşe mutfak'],
    'Навесные шкафчики с сушилкой для посуды, дверца открыта': ['خزائن معلّقة مع مجفف أطباق، الباب مفتوح', 'Bulaşık kurutmalı asma dolaplar, kapak açık'],
    'Навесные шкафчики с закрытыми фасадами над рабочей зоной': ['خزائن معلّقة بواجهات مغلقة فوق منطقة العمل', 'Tezgâh üstünde kapakları kapalı asma dolaplar'],
    'Три навесные полки из МДФ с книгами': ['ثلاثة رفوف معلّقة من MDF عليها كتب', 'Kitaplı üç MDF asma raf'],
    'Навесная полка из МДФ с вазой': ['رف معلّق من MDF عليه مزهرية', 'Vazolu MDF asma raf'],
    'Шведская стенка из дерева с турником, высота 2.5 метра': ['جدار سويدي خشبي مع عقلة، ارتفاعه 2.5 متر', 'Barfiksli ahşap İsveç duvarı, yükseklik 2,5 metre'],
    'До работ, бетонная тумба': ['قبل العمل، قاعدة خرسانية', 'İşten önce, beton alt dolap'],
    'Корпуса собраны, идёт установка': ['الهياكل جاهزة، والتركيب جارٍ', 'Gövdeler hazır, kurulum sürüyor'],
    'Готово, угловой гарнитур': ['جاهز، مطبخ زاوية', 'Hazır, köşe mutfak takımı'],
    'Сушилка внутри корпуса': ['مجفف الأطباق داخل الخزانة', 'Kurutma rafı gövdenin içinde'],
    'Фасады закрыты': ['الواجهات مغلقة', 'Kapaklar kapalı'],
    'Три полки, комната': ['ثلاثة رفوف في غرفة', 'Üç raf, oda'],
    'Одиночная полка, 695 × 295': ['رف مفرد، 695 × 295', 'Tek raf, 695 × 295'],
    'Виды проекта: кухня': ['عروض المشروع: مطبخ', 'Proje görünümleri: mutfak'],
    'Виды проекта: навесные шкафы': ['عروض المشروع: خزائن معلّقة', 'Proje görünümleri: asma dolaplar'],
    'Виды проекта: полки': ['عروض المشروع: رفوف', 'Proje görünümleri: raflar'],
    'кухня': ['مطبخ', 'mutfak'],
    'шкафы': ['خزائن', 'dolaplar'],
    'полки': ['رفوف', 'raflar'],
    'спорткомплекс': ['مجمع رياضي', 'spor köşesi'],
    'Шведская стенка с турником, 2.5 × 0.75 м': ['جدار سويدي مع عقلة، 2.5 × 0.75 م', 'Barfiksli İsveç duvarı, 2,5 × 0,75 m'],

    /* ---------- заявка ---------- */
    'Заявка на замер': ['طلب زيارة القياس', 'Ölçü talebi'],
    'Замерщик приедет, снимет проём и посчитает по факту. Бесплатно и без обязательств.': [
      'سيأتي المُقيِّس ويقيس الفتحة ويحسب التكلفة على أساس القياس الفعلي. مجاناً ودون أي التزام.',
      'Ölçüm uzmanı gelir, boşluğu ölçer ve gerçek ölçüye göre hesaplar. Ücretsiz ve yükümlülüksüz.'],
    'Имя': ['الاسم', 'Ad'],
    'Как к вам обращаться': ['كيف نناديك', 'Size nasıl hitap edelim'],
    'Напишите имя, чтобы замерщик знал, к кому едет': ['اكتب اسمك ليعرف المُقيِّس لمن سيأتي', 'Ölçüm uzmanı kime geleceğini bilsin diye adınızı yazın'],
    'Связь': ['التواصل', 'İletişim'],
    'Телефон или @username в Telegram': ['رقم الهاتف أو @username في تيليغرام', 'Telefon veya Telegram @kullanıcıadı'],
    'Как вам удобнее. Можно просто имя в Telegram.': ['كما يناسبك. يكفي اسم المستخدم في تيليغرام.', 'Size uygun olan. Sadece Telegram kullanıcı adı da olur.'],
    'Оставьте телефон или имя в Telegram, иначе мы не сможем ответить': ['اترك رقم هاتف أو اسم مستخدم في تيليغرام وإلا لن نتمكن من الرد', 'Telefon veya Telegram kullanıcı adı bırakın, aksi halde yanıt veremeyiz'],
    'Что нужно': ['المطلوب', 'İhtiyaç'],
    'Кухня': ['مطبخ', 'Mutfak'],
    'Шкаф': ['خزانة', 'Dolap'],
    'Стол': ['طاولة', 'Masa'],
    'Проём': ['الفتحة', 'Boşluk'],
    'ширина, если знаете': ['العرض إن كنت تعرفه', 'biliyorsanız genişlik'],
    'мм': ['مم', 'mm'],
    'Не обязательно. Точные размеры снимет замерщик.': ['اختياري. سيأخذ المُقيِّس الأبعاد الدقيقة.', 'İsteğe bağlı. Kesin ölçüleri ölçüm uzmanı alır.'],
    'Отправляя заявку, вы соглашаетесь на обработку указанных данных для связи по ней.': [
      'بإرسال الطلب فإنك توافق على معالجة البيانات المذكورة للتواصل معك بشأنه.',
      'Talebi göndererek, belirtilen verilerin bu talep kapsamında iletişim amacıyla işlenmesini kabul edersiniz.'],
    'Имя: {v}': ['الاسم: {v}', 'Ad: {v}'],
    'Связь: {v}': ['التواصل: {v}', 'İletişim: {v}'],
    'Что нужно: {v}': ['المطلوب: {v}', 'İhtiyaç: {v}'],
    'Проём: {v} мм': ['الفتحة: {v} مم', 'Boşluk: {v} mm'],
    'Заявка скопирована. Откройте переписку и вставьте её одним нажатием.': ['تم نسخ الطلب. افتح المحادثة والصقه بضغطة واحدة.', 'Talep kopyalandı. Sohbeti açın ve tek dokunuşla yapıştırın.'],
    'Заявка готова. Скопируйте текст и отправьте его в Telegram.': ['الطلب جاهز. انسخ النص وأرسله في تيليغرام.', "Talep hazır. Metni kopyalayıp Telegram'dan gönderin."],
    'Я сестра': ['أنا أخت', 'Ben kız kardeşim'],
    'Я брат': ['أنا أخ', 'Ben erkek kardeşim'],

    /* ---------- подвал ---------- */
    'Точка': ['نقطة', 'Konfor'],
    'уюта': ['الراحة', 'Noktası'],
    'Корпусная мебель из панелей МДФ на заказ': ['أثاث هيكلي من ألواح MDF حسب الطلب', 'Ölçüye özel MDF panel dolap mobilya'],
    'Написать, сёстры': ['مراسلة، للأخوات', 'Yazın, kız kardeşler'],
    'Написать, братья': ['مراسلة، للإخوة', 'Yazın, erkek kardeşler'],
    'Город': ['المدينة', 'Şehir'],
    'Идлиб-Фуа': ['إدلب - الفوعة', 'İdlib-Fua'],
    'Канал': ['القناة', 'Kanal'],

    /* ---------- конструктор: страница ---------- */
    'Конструктор мебели. Точка уюта': ['مصمّم الأثاث. نقطة الراحة', 'Mobilya tasarım aracı. Konfor Noktası'],
    'Соберите кухню, шкаф, полки или стол под свои размеры и сразу увидите примерную стоимость. Точка уюта, Идлиб-Фуа.': [
      'صمّم مطبخاً أو خزانة أو رفوفاً أو طاولة بأبعادك واطّلع فوراً على التكلفة التقريبية. نقطة الراحة، إدلب - الفوعة.',
      'Mutfak, dolap, raf veya masayı kendi ölçülerinizle tasarlayın ve yaklaşık fiyatı hemen görün. Konfor Noktası, İdlib-Fua.'],
    'Соберите мебель под свои размеры': ['صمّم أثاثك بأبعادك', 'Mobilyanızı kendi ölçülerinize göre tasarlayın'],
    'Загружаем модель': ['جارٍ تحميل النموذج', 'Model yükleniyor'],
    'Настройки изделия': ['إعدادات المنتج', 'Ürün ayarları'],
    'Что собираем': ['ماذا نصمّم', 'Ne tasarlıyoruz'],
    'Изделие': ['المنتج', 'Ürün'],
    'Цвет': ['اللون', 'Renk'],
    'Отправка проекта': ['إرسال المشروع', 'Projeyi gönderme'],
    'Проект готов. Выберите, кому написать: текст подставится в сообщение сам.': ['المشروع جاهز. اختر لمن تكتب: سيُدرج النص في الرسالة تلقائياً.', 'Proje hazır. Kime yazacağınızı seçin: metin mesaja kendiliğinden eklenir.'],
    'Скопировать текст': ['انسخ النص', 'Metni kopyala'],
    'Скопировано': ['تم النسخ', 'Kopyalandı'],
    'Не получилось, выделите текст вручную': ['تعذّر النسخ، حدّد النص يدوياً', 'Olmadı, metni elle seçin'],
    'Примерная стоимость': ['التكلفة التقريبية', 'Yaklaşık fiyat'],
    'Отправить проект': ['أرسل المشروع', 'Projeyi gönder'],
    'Модель не загрузилась, похоже, прервалась связь. Размеры и цена работают.': ['تعذّر تحميل النموذج، ربما انقطع الاتصال. الأبعاد والسعر يعملان.', 'Model yüklenemedi, bağlantı kopmuş olabilir. Ölçüler ve fiyat çalışıyor.'],
    'Этот браузер не показывает 3D-модель. Размеры, цена и отправка проекта работают.': ['هذا المتصفح لا يعرض النموذج ثلاثي الأبعاد. الأبعاد والسعر وإرسال المشروع تعمل.', 'Bu tarayıcı 3B modeli göstermiyor. Ölçüler, fiyat ve proje gönderimi çalışıyor.'],
    'Повторить': ['أعد المحاولة', 'Tekrar dene'],
    'Меньше': ['أقل', 'Azalt'],
    'Больше': ['أكثر', 'Artır'],
    'Стоимость примерная, столешница считается отдельно. Чтобы узнать точную стоимость, свяжитесь с нами.': ['التكلفة تقريبية، وسطح العمل يُحسب بشكل منفصل. لمعرفة التكلفة الدقيقة، تواصل معنا.', 'Fiyat yaklaşıktır, tezgâh ayrıca hesaplanır. Kesin fiyatı öğrenmek için bizimle iletişime geçin.'],
    'Стоимость примерная. Чтобы узнать точную стоимость, свяжитесь с нами.': ['التكلفة تقريبية. لمعرفة التكلفة الدقيقة، تواصل معنا.', 'Fiyat yaklaşıktır. Kesin fiyatı öğrenmek için bizimle iletişime geçin.'],

    /* кнопки сцены */
    'Без дверей': ['بدون أبواب', 'Kapaksız'],
    'С дверями': ['مع الأبواب', 'Kapaklı'],
    'Открыть двери': ['افتح الأبواب', 'Kapakları aç'],
    'Закрыть двери': ['أغلق الأبواب', 'Kapakları kapat'],
    'Открыть дверцу и ящики': ['افتح الباب والأدراج', 'Kapağı ve çekmeceleri aç'],
    'Закрыть дверцу и ящики': ['أغلق الباب والأدراج', 'Kapağı ve çekmeceleri kapat'],
    'Выдвинуть ящики': ['أخرج الأدراج', 'Çekmeceleri çıkar'],
    'Задвинуть ящики': ['أدخل الأدراج', 'Çekmeceleri it'],

    /* ширина каждого шкафа */
    'Ширина отсеков': ['عرض الأقسام', 'Bölme genişlikleri'],
    'Отсек': ['قسم', 'Bölme'],
    'Нижний шкаф': ['خزانة سفلية', 'Alt dolap'],
    'Верхний шкаф': ['خزانة علوية', 'Üst dolap'],
    ', под сушилку': ['، لمجفف الأطباق', ', kurutma rafı için'],
    'Сумма всегда равна ширине шкафа: соседний отсек подстраивается сам.': ['المجموع دائماً يساوي عرض الخزانة: يتكيّف القسم المجاور تلقائياً.', 'Toplam her zaman dolap genişliğine eşittir: komşu bölme kendiliğinden ayarlanır.'],
    'Сумма равна ширине нижних шкафов: соседний шкаф подстраивается сам.': ['المجموع يساوي عرض الخزائن السفلية: تتكيّف الخزانة المجاورة تلقائياً.', 'Toplam alt dolapların genişliğine eşittir: komşu dolap kendiliğinden ayarlanır.'],
    'Сумма равна ширине верхних шкафов: соседний шкаф подстраивается сам.': ['المجموع يساوي عرض الخزائن العلوية: تتكيّف الخزانة المجاورة تلقائياً.', 'Toplam üst dolapların genişliğine eşittir: komşu dolap kendiliğinden ayarlanır.'],
    ', угловой': ['، زاوية', ', köşe'],
    'Угловой шкаф фиксированный: 60 × 60 см, дверь по диагонали.': ['الخزانة الزاوية ثابتة: 60 × 60 سم، بباب قطري.', 'Köşe dolabı sabittir: 60 × 60 cm, çapraz kapaklı.'],
    'Верхний угловой шкаф со срезом: 600 × 600 мм, дверь по диагонали': ['خزانة علوية زاوية بقطع مائل: 600 × 600 مم، بباب قطري', 'Üst köşe dolabı, köşesi kesik: 600 × 600 mm, çapraz kapaklı'],
    'Шкаф под сушилку фиксированный: внутри него ровно 80 см.': ['خزانة المجفف ثابتة: عرضها الداخلي 80 سم بالضبط.', 'Kurutma rafı dolabı sabittir: içi tam 80 cm.'],

    /* поля изделий */
    'Форма': ['الشكل', 'Form'],
    'Прямая': ['مستقيم', 'Düz'],
    'Угловая': ['زاوية', 'L şeklinde'],
    'Ширина нижних шкафов': ['عرض الخزائن السفلية', 'Alt dolap genişliği'],
    'Вторая сторона нижних шкафов': ['الضلع الثاني للخزائن السفلية', 'Alt dolapların ikinci kenarı'],
    'Глубина нижних шкафов': ['عمق الخزائن السفلية', 'Alt dolap derinliği'],
    'Высота нижних шкафов': ['ارتفاع الخزائن السفلية', 'Alt dolap yüksekliği'],
    'Ширина верхних шкафов': ['عرض الخزائن العلوية', 'Üst dolap genişliği'],
    'Вторая сторона верхних шкафов': ['الضلع الثاني للخزائن العلوية', 'Üst dolapların ikinci kenarı'],
    'Глубина верхних шкафов': ['عمق الخزائن العلوية', 'Üst dolap derinliği'],
    'Высота верхних шкафов': ['ارتفاع الخزائن العلوية', 'Üst dolap yüksekliği'],
    'Шкафов в ряду': ['عدد الخزائن في الصف', 'Sıradaki dolap sayısı'],
    'Полок в шкафу': ['عدد الرفوف في الخزانة', 'Dolaptaki raf sayısı'],
    'Нижние шкафы': ['الخزائن السفلية', 'Alt dolaplar'],
    'С нижними': ['مع خزائن سفلية', 'Alt dolaplı'],
    'Без нижних': ['بدون خزائن سفلية', 'Alt dolapsız'],
    'Сушилка для посуды': ['مجفف الأطباق', 'Bulaşık kurutma rafı'],
    'Без сушилки': ['بدون مجفف', 'Kurutmasız'],
    'С сушилкой 80 см': ['مع مجفف 80 سم', 'Kurutmalı 80 cm'],
    'Ширина': ['العرض', 'Genişlik'],
    'Высота': ['الارتفاع', 'Yükseklik'],
    'Глубина': ['العمق', 'Derinlik'],
    'Отсеков': ['عدد الأقسام', 'Bölme sayısı'],
    'Со штангой для одежды': ['بقضيب لتعليق الملابس', 'Elbise askılıklı'],
    'Полок в отсеке': ['عدد الرفوف في القسم', 'Bölmedeki raf sayısı'],
    'Двери': ['الأبواب', 'Kapaklar'],
    'На петлях': ['مفصلية', 'Menteşeli'],
    'Купе': ['جرّارة', 'Sürgülü'],
    'Длина': ['الطول', 'Uzunluk'],
    'Количество полок': ['عدد الرفوف', 'Raf sayısı'],
    'Между полками': ['المسافة بين الرفوف', 'Raflar arası'],
    'Тумбы': ['الوحدات الجانبية', 'Yan üniteler'],
    'Без тумб': ['بدون وحدات جانبية', 'Ünitesiz'],
    'С одной стороны': ['من جانب واحد', 'Tek tarafta'],
    'С двух сторон': ['من الجانبين', 'İki tarafta'],
    'Тумба': ['الوحدة', 'Ünite'],
    'С дверцей': ['بباب', 'Kapaklı'],
    'С ящиками': ['بأدراج', 'Çekmeceli'],
    'Дверца слева, ящики справа': ['باب على اليسار وأدراج على اليمين', 'Solda kapak, sağda çekmece'],

    /* цвета */
    'Белый': ['أبيض', 'Beyaz'],
    'Кремовый': ['كريمي', 'Krem'],
    'Бежево-сиреневый': ['بيج مائل إلى البنفسجي', 'Bej-lila'],
    'Серый': ['رمادي', 'Gri'],
    'Светлый дуб': ['بلوط فاتح', 'Açık meşe'],
    'Орех': ['جوز', 'Ceviz'],
    'Графит': ['غرافيت', 'Grafit'],

    /* текст проекта для Telegram */
    'Проект из конструктора': ['مشروع من المصمّم', 'Tasarım aracından proje'],
    'Цвет: {c}': ['اللون: {c}', 'Renk: {c}'],
    'Примерная стоимость: {p} $': ['التكلفة التقريبية: {p} $', 'Yaklaşık fiyat: {p} $'],
    'Проект: {u}': ['المشروع: {u}', 'Proje: {u}'],
    'Кухня, угловая': ['مطبخ، زاوية', 'Mutfak, L şeklinde'],
    'Кухня, прямая': ['مطبخ، مستقيم', 'Mutfak, düz'],
    '(по шкафам: {l})': ['(حسب الخزائن: {l})', '(dolaplara göre: {l})'],
    'Нижние шкафы: ширина {w} мм{l}, глубина {d} мм, высота {h} мм': ['الخزائن السفلية: العرض {w} مم{l}، العمق {d} مم، الارتفاع {h} مم', 'Alt dolaplar: genişlik {w} mm{l}, derinlik {d} mm, yükseklik {h} mm'],
    'Без нижних шкафов': ['بدون خزائن سفلية', 'Alt dolap yok'],
    'Верхние шкафы: ширина {w} мм{l}, глубина {d} мм, высота {h} мм': ['الخزائن العلوية: العرض {w} مم{l}، العمق {d} مم، الارتفاع {h} مم', 'Üst dolaplar: genişlik {w} mm{l}, derinlik {d} mm, yükseklik {h} mm'],
    'Полок в каждом шкафу: {n}': ['عدد الرفوف في كل خزانة: {n}', 'Her dolapta raf sayısı: {n}'],
    'Полок в каждом шкафу, кроме шкафа с сушилкой: {n}': ['عدد الرفوف في كل خزانة عدا خزانة المجفف: {n}', 'Kurutma rafı dolabı hariç her dolapta raf sayısı: {n}'],
    'Шкафов в ряду: {n}': ['عدد الخزائن في الصف: {n}', 'Sıradaki dolap sayısı: {n}'],
    'Сушилка для посуды 80 см в первом верхнем шкафу': ['مجفف أطباق 80 سم في أول خزانة علوية', 'İlk üst dolapta 80 cm bulaşık kurutma rafı'],
    'Размер: {w} × {h} × {d} мм': ['الأبعاد: {w} × {h} × {d} مم', 'Boyut: {w} × {h} × {d} mm'],
    'Отсеков: {n}, из них со штангой для одежды: {r}': ['عدد الأقسام: {n}، منها بقضيب للملابس: {r}', 'Bölme sayısı: {n}, bunlardan askılıklı: {r}'],
    'Ширина отсеков: {l} мм': ['عرض الأقسام: {l} مم', 'Bölme genişlikleri: {l} mm'],
    'Полок в остальных отсеках: {n}': ['الرفوف في باقي الأقسام: {n}', 'Diğer bölmelerde raf sayısı: {n}'],
    'Все отсеки со штангой': ['كل الأقسام بقضيب للملابس', 'Tüm bölmeler askılıklı'],
    'Двери на петлях': ['أبواب مفصلية', 'Menteşeli kapaklar'],
    'Двери-купе': ['أبواب جرّارة', 'Sürgülü kapaklar'],
    'Открытый, без дверей': ['مفتوحة، بدون أبواب', 'Açık, kapaksız'],
    'Размер полки: {w} × {d} мм': ['أبعاد الرف: {w} × {d} مم', 'Raf boyutu: {w} × {d} mm'],
    'Количество: {n}, между полками {g} мм': ['العدد: {n}، المسافة بين الرفوف {g} مم', 'Adet: {n}, raflar arası {g} mm'],
    'Количество: 1': ['العدد: 1', 'Adet: 1'],
    'Размер: {w} × {d} мм, высота {h} мм': ['الأبعاد: {w} × {d} مم، الارتفاع {h} مم', 'Boyut: {w} × {d} mm, yükseklik {h} mm'],
    'Тумбы с двух сторон: слева с дверцей, справа с тремя ящиками': ['وحدات من الجانبين: على اليسار بباب وعلى اليمين بثلاثة أدراج', 'İki tarafta ünite: solda kapaklı, sağda üç çekmeceli'],
    'Тумбы с двух сторон, с дверцей': ['وحدات من الجانبين، بباب', 'İki tarafta ünite, kapaklı'],
    'Тумбы с двух сторон, с тремя ящиками': ['وحدات من الجانبين، بثلاثة أدراج', 'İki tarafta ünite, üç çekmeceli'],
    'Тумба с одной стороны, с дверцей': ['وحدة من جانب واحد، بباب', 'Tek tarafta ünite, kapaklı'],
    'Тумба с одной стороны, с тремя ящиками': ['وحدة من جانب واحد، بثلاثة أدراج', 'Tek tarafta ünite, üç çekmeceli']
  };

  /* ---------- состояние ---------- */
  var lang = 'ru';
  var textOrig = new WeakMap();
  var attrOrig = new WeakMap();
  var ATTRS = ['alt', 'aria-label', 'placeholder', 'title'];

  function norm(s) { return s.replace(/[\s ]+/g, ' ').trim(); }

  function lookup(key) {
    var e = D[key];
    return e ? e[IDX[lang]] : null;
  }

  function fmt(s, vars) {
    return vars ? s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] === undefined ? m : vars[k]; }) : s;
  }

  /* перевод строки из кода страницы; нет перевода: остаётся русский */
  function t(key, vars) {
    var tr = lang === 'ru' ? null : lookup(key);
    return fmt(tr != null ? tr : key, vars);
  }

  /* ---------- разметка ---------- */
  function translateText(node) {
    var orig = textOrig.get(node);
    if (orig === undefined) { orig = node.nodeValue; textOrig.set(node, orig); }
    var key = norm(orig);
    if (!key) return;
    var tr = lang === 'ru' ? null : lookup(key);
    if (tr == null) { if (node.nodeValue !== orig) node.nodeValue = orig; return; }
    node.nodeValue = /^\s*/.exec(orig)[0] + tr + /\s*$/.exec(orig)[0];
  }

  function translateAttrs(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i];
      if (!el.hasAttribute(a)) continue;
      var saved = attrOrig.get(el);
      if (!saved) { saved = {}; attrOrig.set(el, saved); }
      if (!(a in saved)) saved[a] = el.getAttribute(a);
      var tr = lang === 'ru' ? null : lookup(norm(saved[a]));
      el.setAttribute(a, tr != null ? tr : saved[a]);
    }
  }

  function visit(n) {
    if (n.nodeType === 3) { translateText(n); return; }
    if (n.nodeType !== 1) return;
    var tag = n.nodeName.toUpperCase();
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'PRE' || n.hasAttribute('data-no-i18n')) return;
    translateAttrs(n);
    if (n.hasAttribute('data-js')) return;
    for (var c = n.firstChild; c; c = c.nextSibling) visit(c);
  }

  /* title и description лежат в head, их обходим отдельно */
  var headOrig = null;
  function translateHead() {
    var meta = document.querySelector('meta[name="description"]');
    if (!headOrig) headOrig = { title: document.title, desc: meta ? meta.getAttribute('content') : '' };
    var tt = lang === 'ru' ? null : lookup(norm(headOrig.title));
    document.title = tt != null ? tt : headOrig.title;
    if (meta) {
      var td = lang === 'ru' ? null : lookup(norm(headOrig.desc));
      meta.setAttribute('content', td != null ? td : headOrig.desc);
    }
  }

  /* у арабского нет букв в Geologica и JetBrains Mono: подгружаем гарнитуру только тогда, когда она нужна */
  function loadArabicFont() {
    if (document.getElementById('font-ar')) return;
    var l = document.createElement('link');
    l.id = 'font-ar';
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;500;600&display=swap';
    document.head.appendChild(l);
  }

  function apply() {
    var root = document.documentElement;
    root.lang = lang;
    root.dir = LANGS[lang].dir;
    if (lang === 'ar') loadArabicFont();
    translateHead();
    if (document.body) visit(document.body);
    var sel = document.getElementById('lang');
    if (sel && sel.value !== lang) sel.value = lang;
  }

  function stored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function detect() {
    var s = stored();
    if (s && LANGS[s]) return s;
    var list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'ru'];
    for (var i = 0; i < list.length; i++) {
      var code = String(list[i]).slice(0, 2).toLowerCase();
      if (LANGS[code]) return code;
    }
    return 'ru';
  }

  function setLang(next, save) {
    if (!LANGS[next]) return;
    lang = next;
    if (save) { try { localStorage.setItem(KEY, next); } catch (e) { /* без хранилища язык просто не запомнится */ } }
    apply();
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: lang } }));
  }

  /* ---------- переключатель в шапке ---------- */
  function buildSwitcher() {
    var top = document.querySelector('.top');
    if (!top || document.getElementById('lang')) return;
    var sel = document.createElement('select');
    sel.id = 'lang';
    sel.className = 'lang';
    sel.setAttribute('aria-label', 'Язык / Dil / اللغة');
    Object.keys(LANGS).forEach(function (code) {
      var o = document.createElement('option');
      o.value = code;
      o.textContent = LANGS[code].tag;
      o.setAttribute('aria-label', LANGS[code].name);
      sel.appendChild(o);
    });
    sel.addEventListener('change', function () { setLang(sel.value, true); });
    var cta = top.querySelector('.top__cta');
    top.insertBefore(sel, cta || null);
  }

  window.t = t;
  window.I18N = { get lang() { return lang; }, dir: function () { return LANGS[lang].dir; }, set: setLang };

  lang = detect();
  buildSwitcher();
  apply();
})();
