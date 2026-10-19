/** Tipos de la API (espejo de docs/openapi.yaml del backend). */
export type Role = "ADMIN" | "SALES" | "WAREHOUSE";

export type Page<T> = { count: number; page: number; pages: number; items: T[] };
export type PageQuery = { page?: number; limit?: number };

export type User = {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  role: Role;
  active: boolean;
  createdAt: string;
  /** v4.2: datos de contacto editables en Mi perfil. */
  email?: string | null;
  phone?: string | null;
  lastSeenAt?: string | null;
  updatedAt?: string | null;
};
export type SigninResponse = { token: string; user: User };
export type CreateUserInput = { firstName: string; lastName: string; username: string; password: string; role: Role };
export type ChangePasswordInput = { currentPassword: string; newPassword: string };

export type Category = { id: number; name: string; active: boolean; createdAt: string };

export type Product = {
  id: number;
  name: string;
  sku: string;
  categoryId: number;
  categoryName: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  /** Unidades de lotes no vencidos: lo que se puede vender hoy (`stock` incluye lo vencido aún en bodega). */
  availableStock: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};
export type CreateProductInput = { name: string; sku: string; categoryId: number; purchasePrice: number; salePrice: number };
export type UpdateProductInput = Partial<CreateProductInput> & { active?: boolean };
export type ProductQuery = PageQuery & { category?: number; active?: boolean; search?: string };

export type ProductBatch = {
  id: number;
  productId: number;
  productName: string;
  supplierId: number | null;
  supplierName: string | null;
  quantity: number;
  quantityRemaining: number;
  unitCost: number;
  expiresAt: string;
  expired: boolean;
  daysToExpire: number;
  createdAt: string;
};
export type CreateBatchInput = { quantity: number; expiresAt: string; unitCost?: number; supplierId?: number };
export type CreatePurchaseInput = { productId: number; quantity: number; unitCost: number; expiresAt: string };

export type Supplier = { id: number; name: string; taxId: string | null; phone: string | null; active: boolean; createdAt: string };
export type CreateSupplierInput = { name: string; taxId?: string; phone?: string };
export type UpdateSupplierInput = { name?: string; taxId?: string | null; phone?: string | null; active?: boolean };

export type Customer = {
  id: number;
  name: string;
  documentId: string;
  phone: string | null;
  creditLimit: number;
  balance: number;
  availableCredit: number;
  active: boolean;
  createdAt: string;
};
export type CreateCustomerInput = { name: string; documentId: string; phone?: string; creditLimit?: number };
export type UpdateCustomerInput = { name?: string; documentId?: string; phone?: string | null; creditLimit?: number; active?: boolean };
export type CustomerQuery = PageQuery & { active?: boolean; search?: string; withBalance?: boolean };
export type CustomerBalance = {
  customerId: number;
  name: string;
  creditLimit: number;
  balance: number;
  availableCredit: number;
  lastCreditSaleAt: string | null;
  lastPaymentAt: string | null;
  overdue: boolean;
  overdueDays: number;
};
export type CustomerPayment = { id: number; customerId: number; userId: number; amount: number; balanceAfter: number; createdAt: string };

export type PaymentType = "CASH" | "CREDIT";
export type SaleStatus = "COMPLETED" | "VOIDED";
export type SaleLineInput = { productId: number; quantity: number };
export type CreateSaleInput = { customerId?: number; paymentType: PaymentType; lines: SaleLineInput[] };
export type Sale = {
  id: number;
  invoiceNumber: string;
  customerId: number | null;
  customerName: string | null;
  userId: number;
  username: string;
  paymentType: PaymentType;
  total: number;
  status: SaleStatus;
  voidedAt: string | null;
  voidedBy: number | null;
  createdAt: string;
};
export type SaleLine = { id: number; productId: number; productName: string; sku: string; quantity: number; unitPrice: number; lineTotal: number };
export type SaleDetail = Sale & { lines: SaleLine[] };
export type SaleQuery = PageQuery & { from?: string; to?: string; customerId?: number; userId?: number; status?: SaleStatus };

/** method: POST/PUT/PATCH/DELETE para escrituras; EXPORT = reporte generado; SIGNIN = inicio de sesión (v4.2). */
export type Audit = { id: number; userId: number; username: string; method: string; resource: string; detail?: string | null; aiSuggested?: boolean; createdAt: string };
export type AuditQuery = PageQuery & { userId?: number; resource?: string; method?: string; from?: string; to?: string };

export type SalesGroupBy = "day" | "product";
export type SalesReportDayRow = { date: string; salesCount: number; units: number; total: number };
export type SalesReportProductRow = { productId: number; productName: string; sku: string; salesCount: number; units: number; total: number };
export type SalesReport = {
  from: string;
  to: string;
  groupBy: SalesGroupBy;
  salesCount: number;
  units: number;
  total: number;
  cashTotal: number;
  creditTotal: number;
  rows: SalesReportDayRow[] | SalesReportProductRow[];
};
export type BatchAggregate = { batches: number; units: number; costValue: number };
export type InventoryReport = {
  asOf: string;
  expiringDays: number;
  products: number;
  activeProducts: number;
  units: number;
  costValue: number;
  saleValue: number;
  outOfStock: number;
  expiringSoon: BatchAggregate;
  expired: BatchAggregate;
  byCategory: { categoryId: number; categoryName: string; products: number; units: number; costValue: number; saleValue: number }[];
};
export type ReceivableRow = {
  customerId: number;
  name: string;
  creditLimit: number;
  balance: number;
  lastCreditSaleAt: string | null;
  lastPaymentAt: string | null;
  overdue: boolean;
};
export type ReceivablesReport = {
  overdueDays: number;
  customersWithBalance: number;
  totalBalance: number;
  overdueCustomers: number;
  overdueBalance: number;
  items: ReceivableRow[];
};

export type Assumptions = {
  monthlySales: number;
  costOfSalesPct: number;
  fixedExpensesMonth: number;
  baseSalesGrowth: number;
  constructionInvestment: number;
  equipmentInvestment: number;
  salesIncreasePct: number;
  additionalFixedExpensesMonth: number;
  inventoryTurnover: number;
  creditRateEA: number;
  termMonths: number;
  tmarEA: number;
  investorRateEA: number;
  horizonYears: number;
  inflation: number;
  salvageValuePct: number;
  ownerWithdrawalsMonth: number;
};
export type CreateScenarioInput = {
  name: string;
  fixedInvestment: number;
  creditPct: number;
  termMonths: number;
  salesIncrease: number;
  additionalExpensesMonth: number;
  creditCoversWorkingCapital?: boolean;
  assumptions?: Partial<Assumptions>;
};
export type ScenarioIndicators = {
  workingCapital: number;
  totalInvestment: number;
  credit: number;
  ownContribution: number;
  installment: number;
  totalInterest: number;
  npv: number;
  irr: number | null;
  paybackSimple: number | null;
  paybackDiscounted: number | null;
  profitabilityIndex: number;
  benefitCostRatio: number;
  investorNpv: number;
  investorIrr: number | null;
  coverageWithSales: number | null;
  coverageWithoutSales: number | null;
  coverageIncremental: number | null;
  signChanges: number;
};
export type ScenarioSummary = {
  id: number;
  name: string;
  userId: number;
  username: string;
  fixedInvestment: number;
  creditPct: number;
  termMonths: number;
  salesIncrease: number;
  additionalExpensesMonth: number;
  creditCoversWorkingCapital: boolean;
  indicators: ScenarioIndicators;
  createdAt: string;
  updatedAt: string;
};
export type CashFlowDetail = { year: number; margin: number; expenses: number; workingCapitalDelta: number; salvage: number; workingCapitalRecovery: number; flow: number };
export type ScenarioDetail = ScenarioSummary & {
  assumptions: Assumptions;
  results: ScenarioIndicators & { fixedInvestment: number; flows: number[]; investorFlows: number[]; debtService: number[]; detail: CashFlowDetail[] };
};
export type AmortizationRow = { month: number; installment: number; interest: number; principal: number; balance: number };
export type Amortization = { scenarioId: number; credit: number; termMonths: number; installment: number; totalInterest: number; rows: AmortizationRow[] };
export type SensitivityVariable = "salesIncrease" | "inventoryTurnover" | "tmar";
export type Range = { from: number; to: number; step: number };
export type Sensitivity = { scenarioId: number; variable: SensitivityVariable; range: Range; points: { value: number; npv: number; irr: number | null }[] };
export type Bivariate = { scenarioId: number; varX: SensitivityVariable; varY: SensitivityVariable; xValues: number[]; yValues: number[]; npv: number[][] };
export type TornadoBar = { variable: string; low: number; high: number; npvLow: number; npvHigh: number; amplitude: number };
export type Tornado = { scenarioId: number; delta: number; baseNpv: number; bars: TornadoBar[] };

// --- Tiempo real (v4): chat, notificaciones, búsqueda, perfil y contacto ---

export type Person = { id: number; name: string; username: string; role: Role };
export type DirectoryPerson = Person & { online: boolean; lastSeenAt: string | null };

export type ChatMessage = {
  id: number;
  sender: Person;
  /** null en el canal general. */
  recipientId: number | null;
  content: string;
  readAt: string | null;
  createdAt: string;
};
export type MessagePage = { messages: ChatMessage[]; hasMore: boolean };
export type Conversation = {
  person: Person;
  lastMessage: { id: number; content: string; senderId: number; createdAt: string };
  unread: number;
};

export type NotificationKind = "SALE" | "SALE_VOIDED" | "PAYMENT" | "PURCHASE" | "LOW_STOCK" | "SCENARIO" | "CONTACT" | "MESSAGE";
export type AppNotification = { id: number; kind: NotificationKind; message: string; link: string | null; read: boolean; createdAt: string };
export type NotificationList = { notifications: AppNotification[]; unread: number };

export type SearchResults = {
  products: { id: number; name: string; sku: string; stock: number }[];
  customers: { id: number; name: string; document: string | null; balance: number }[];
  suppliers: { id: number; name: string }[];
  sales: { id: number; invoiceNumber: string; customerName: string | null; total: number; createdAt: string }[];
  people: Person[];
};

export type UpdateProfileInput = { firstName: string; lastName: string; email?: string | null; phone?: string | null };

/** Mi actividad (v4.2): últimas acciones propias y conteos de 30 días, desde la auditoría. */
export type ActivityItem = { id: number; method: string; resource: string; detail: string | null; createdAt: string };
export type MyActivity = {
  items: ActivityItem[];
  last30Days: { writes: number; exports: number; signins: number; sales: number; payments: number; batches: number };
  lastSigninAt: string | null;
};

/** Reportes descargables (v4.2): PDF con gráficos o Excel, generados y auditados por la API. */
export type ExportFormat = "pdf" | "xlsx";
export type ContactInput = { name: string; email: string; phone?: string; message: string };
export type ContactMessage = ContactInput & { id: number; handled: boolean; createdAt: string };

/* ---------- Asistente de IA (rutas /ai; ninguna escribe datos) ---------- */
export type AiStatus = { enabled: boolean; model: string | null };
export type AiChatTurn = { role: "user" | "assistant"; content: string; attachments?: AiAttachment[] };
export type AiSource = { tool: string; label: string };
export type AiSaleProposal = {
  type: "sale";
  customerId: number | null;
  customerName: string | null;
  paymentType: PaymentType;
  lines: { productId: number; productName: string; quantity: number; unitPrice: number; available: number }[];
  estimatedTotal: number;
  warnings: string[];
};
export type AiPaymentProposal = { type: "payment"; customerId: number; customerName: string; amount: number; balance: number };
export type AiPurchaseProposal = { type: "purchase"; supplierId: number | null; supplierName: string | null; productId: number; productName: string; quantity: number; unitCost: number; expiresAt: string };
/** Formulario prellenado en su pantalla (venta, abono o compra), para quien prefiera revisarlo allí. */
export type AiHandoff = AiSaleProposal | AiPaymentProposal | AiPurchaseProposal;
/** Petición exacta que la app envía a la API real si la persona confirma (misma validación, permisos y auditoría). */
export type AiActionRequest = { method: "POST" | "PUT" | "PATCH" | "DELETE"; path: string; body?: Record<string, unknown> };
export type AiAction = { type: "action"; kind: string; title: string; lines: string[]; warnings: string[]; confirmLabel: string; request: AiActionRequest; handoff?: AiHandoff };
export type AiReportKind = "sales" | "inventory" | "receivables";
export type AiReportProposal = { type: "report"; report: AiReportKind; title: string; lines: string[]; params: Record<string, string | number> };
export type AiProposal = AiAction | AiReportProposal;
/** Adjunto de una pregunta: imagen o PDF en base64, o el texto de una hoja de cálculo o archivo de texto. */
export type AiAttachment =
  | { kind: "image"; name: string; mediaType: "image/jpeg"; data: string }
  | { kind: "pdf"; name: string; data: string }
  | { kind: "text"; name: string; text: string };
export type AiReply = { reply: string; sources: AiSource[]; proposals: AiProposal[] };

export type AiInsight =
  | { kind: "restock"; productId: number; productName: string; sku: string; available: number; dailyAvg: number; coverDays: number; suggestedQty: number }
  | { kind: "rotate"; batchId: number; productId: number; productName: string; expiresAt: string; daysToExpire: number; remaining: number; projectedSold: number; surplus: number; surplusCost: number }
  | { kind: "collect"; customerId: number; name: string; phone: string | null; balance: number; creditLimit: number; usedPct: number; overdue: boolean; daysSincePayment: number | null }
  | { kind: "idle"; productId: number; productName: string; sku: string; available: number; costValue: number; lastSaleAt: string | null };
export type AiBriefing = { text: string | null; generatedAt: string; insights: AiInsight[] };

export type AiInvoiceCandidate = { productId: number; name: string; sku: string; purchasePrice: number; score: number };
export type AiInvoiceLine = { description: string; quantity: number | null; unitCost: number | null; expiresAt: string | null; lot: string | null; candidates: AiInvoiceCandidate[]; warnings: string[] };
export type AiInvoiceReading = {
  supplier: { name: string | null; taxId: string | null; match: { supplierId: number; name: string } | null };
  invoiceNumber: string | null;
  invoiceDate: string | null;
  lines: AiInvoiceLine[];
  notes: string | null;
};
export type AiDraftKind = "collection_message" | "contact_reply" | "report_summary" | "scenario_explain";
export type AiDraftRequest = { kind: AiDraftKind; customerId?: number; contactId?: number; scenarioId?: number; from?: string; to?: string };
export type AiDraft = { kind: AiDraftKind; text: string; phone: string | null };
