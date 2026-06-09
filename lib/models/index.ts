import {
  Sequelize,
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import type { AiInstructionsRecord } from "@/lib/ai-instructions";
import type { OrderRequirements } from "@/lib/order-requirements";

export class User extends Model<
  InferAttributes<User>,
  InferCreationAttributes<User>
> {
  declare id: CreationOptional<number>;
  declare email: string;
  declare passwordHash: string;
  declare name: string | null;
}

export class Business extends Model<
  InferAttributes<Business>,
  InferCreationAttributes<Business>
> {
  declare id: CreationOptional<number>;
  declare ownerUserId: number;
  declare businessName: string | null;
  declare businessType: string | null;
  declare country: string | null;
  declare currency: CreationOptional<string>;
  declare whatsappNumber: string | null;
  /** First WhatsApp number linked to this account — never cleared after connect. */
  declare boundWhatsappNumber: string | null;
  declare waStatus: CreationOptional<string>;
  declare waQrDataUrl: string | null;
  /** Inbox only shows messages at or after this time (set when WhatsApp becomes ready). */
  declare waConnectedAt: Date | null;
  declare businessDescription: string | null;
  declare replyTone: string | null;
  declare aiInstructions: AiInstructionsRecord | null;
  declare anthropicApiKey: string | null;
  declare aiAutoReplyEnabled: CreationOptional<boolean>;
  declare orderRequirements: OrderRequirements | null;
  /** trial | starter | pro | enterprise */
  declare plan: string | null;
  /** trial_active | trial_expired | active | expired | renewal_failed */
  declare billingStatus: string | null;
  /** Trial end or subscription period end */
  declare periodEndsAt: Date | null;
  declare whopMembershipId: string | null;
  declare billingEmailSentAt: Date | null;
  /** Last lifecycle email sent: trial_expired | renewal_failed | subscription_expired */
  declare billingNoticeKey: string | null;
  declare apiAccessEnabled: CreationOptional<boolean>;
  declare usagePeriodStart: Date | null;
  declare subscriptionStartedAt: Date | null;
  declare cancelAtPeriodEnd: CreationOptional<boolean>;
  /** Extra AI replies added by admin on top of plan limit. */
  declare quotaAiBonus: CreationOptional<number>;
  /** Extra contacts added by admin on top of plan limit. */
  declare quotaContactsBonus: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class WhatsAppMessage extends Model<
  InferAttributes<WhatsAppMessage>,
  InferCreationAttributes<WhatsAppMessage>
> {
  declare id: CreationOptional<number>;
  declare businessId: number;
  declare senderWaId: string;
  /** Full WhatsApp chat jid (e.g. …@c.us or …@lid) for reliable outbound send. */
  declare whatsappChatId: string | null;
  declare senderName: string | null;
  declare text: string;
  declare messageType: string;
  declare direction: string;
  declare status: string;
  declare outgoingSource: string | null;
  /** Stable WhatsApp message id (e.g. serialized id) for dedup on server restart. */
  declare waMessageKey: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class Product extends Model<
  InferAttributes<Product>,
  InferCreationAttributes<Product>
> {
  declare id: CreationOptional<number>;
  declare businessId: number;
  declare productName: string;
  declare productDescription: string | null;
  declare price: string;
  declare quantity: number;
  declare subtractOnOrder: boolean;
  declare discountEnabled: boolean;
  declare discountValue: string | null;
  declare discountIsPercent: boolean;
  declare discountValidDate: string | null;
  declare brandName: string | null;
  declare colorsJson: string | null;
  declare imagesJson: string | null;
  declare bargainingLowAmount: string | null;
}

export class BlockedContact extends Model<
  InferAttributes<BlockedContact>,
  InferCreationAttributes<BlockedContact>
> {
  declare id: CreationOptional<number>;
  declare businessId: number;
  declare normalizedWaId: string;
  declare displayInput: string | null;
}

export class WhatsAppFollowUp extends Model<
  InferAttributes<WhatsAppFollowUp>,
  InferCreationAttributes<WhatsAppFollowUp>
> {
  declare id: CreationOptional<number>;
  declare businessId: number;
  declare customerWaId: string;
  declare contactRawWaId: string;
  declare productId: number;
  declare productName: string;
  declare bargainPrice: string;
  declare customerPrice: string;
  declare scheduledAt: Date;
  declare anchorAt: Date;
  declare lastIncomingMessageId: number;
  declare sentAt: Date | null;
  declare status: string;
}

export class CompletedOrder extends Model<
  InferAttributes<CompletedOrder>,
  InferCreationAttributes<CompletedOrder>
> {
  declare id: CreationOptional<number>;
  declare businessId: number;
  declare productId: CreationOptional<number | null>;
  declare productName: string;
  declare quantitySold: number;
  declare unitPrice: string;
  declare lineTotal: string;
  declare customerWaId: string | null;
  declare deliveryNote: string | null;
  declare orderSource: string | null;
  declare status: CreationOptional<string>;
  declare orderGroupId: string | null;
  declare orderPaymentProof: string | null;
  declare deliveryPaymentProof: string | null;
}

export type OrderActionPerformer = "customer" | "owner" | "system";

export class OrderActionLog extends Model<
  InferAttributes<OrderActionLog>,
  InferCreationAttributes<OrderActionLog>
> {
  declare id: CreationOptional<number>;
  declare businessId: number;
  declare orderGroupId: string | null;
  declare leadOrderId: number | null;
  declare actionType: string;
  declare previousStatus: string | null;
  declare newStatus: string | null;
  declare performedBy: OrderActionPerformer;
  declare performedByUserId: number | null;
  declare notes: string | null;
  declare metadata: Record<string, unknown> | null;
}

export class CustomerOrderSession extends Model<
  InferAttributes<CustomerOrderSession>,
  InferCreationAttributes<CustomerOrderSession>
> {
  declare id: CreationOptional<number>;
  declare businessId: number;
  declare customerWaId: string;
  declare committed: CreationOptional<boolean>;
  declare cartJson: string | null;
  declare deliveryAddress: string | null;
  declare deliveryPaymentProof: string | null;
  declare orderPaymentProof: string | null;
  declare orderGroupId: string | null;
  declare placedAt: Date | null;
}

export function initModels(sequelize: Sequelize): void {
  User.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      name: DataTypes.STRING(255),
    },
    { sequelize, modelName: "User", tableName: "users", underscored: true }
  );

  Business.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      ownerUserId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      businessName: DataTypes.STRING(255),
      businessType: DataTypes.STRING(128),
      country: DataTypes.STRING(128),
      currency: {
        type: DataTypes.STRING(8),
        allowNull: false,
        defaultValue: "PKR",
      },
      whatsappNumber: DataTypes.STRING(64),
      boundWhatsappNumber: DataTypes.STRING(64),
      waStatus: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "disconnected",
      },
      waQrDataUrl: DataTypes.TEXT("medium"),
      waConnectedAt: DataTypes.DATE,
      businessDescription: DataTypes.TEXT,
      replyTone: DataTypes.STRING(64),
      aiInstructions: DataTypes.JSON,
      anthropicApiKey: DataTypes.TEXT,
      aiAutoReplyEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      orderRequirements: DataTypes.JSON,
      plan: DataTypes.STRING(32),
      billingStatus: DataTypes.STRING(32),
      periodEndsAt: DataTypes.DATE,
      whopMembershipId: DataTypes.STRING(128),
      billingEmailSentAt: DataTypes.DATE,
      billingNoticeKey: DataTypes.STRING(32),
      apiAccessEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      usagePeriodStart: DataTypes.DATE,
      subscriptionStartedAt: DataTypes.DATE,
      cancelAtPeriodEnd: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      quotaAiBonus: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
      },
      quotaContactsBonus: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    { sequelize, modelName: "Business", tableName: "businesses", underscored: true }
  );

  WhatsAppMessage.init(
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      businessId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      senderWaId: {
        type: DataTypes.STRING(32),
        allowNull: false,
      },
      whatsappChatId: DataTypes.STRING(64),
      senderName: DataTypes.STRING(256),
      text: { type: DataTypes.TEXT, allowNull: false },
      messageType: { type: DataTypes.STRING(32), allowNull: false },
      direction: {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: "incoming",
      },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "unread",
      },
      outgoingSource: DataTypes.STRING(16),
      waMessageKey: DataTypes.STRING(128),
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "WhatsAppMessage",
      tableName: "whatsapp_messages",
      underscored: true,
    }
  );

  Product.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      businessId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "businesses", key: "id" },
        onDelete: "CASCADE",
      },
      productName: { type: DataTypes.STRING(255), allowNull: false },
      productDescription: DataTypes.TEXT,
      price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      quantity: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
      },
      subtractOnOrder: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      discountEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      discountValue: DataTypes.DECIMAL(12, 2),
      discountIsPercent: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      discountValidDate: DataTypes.DATEONLY,
      brandName: DataTypes.STRING(255),
      colorsJson: DataTypes.TEXT,
      imagesJson: DataTypes.TEXT("long"),
      bargainingLowAmount: DataTypes.DECIMAL(12, 2),
    },
    { sequelize, modelName: "Product", tableName: "products", underscored: true }
  );

  WhatsAppFollowUp.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      businessId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "businesses", key: "id" },
        onDelete: "CASCADE",
      },
      customerWaId: { type: DataTypes.STRING(32), allowNull: false },
      contactRawWaId: { type: DataTypes.STRING(32), allowNull: false },
      productId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      productName: { type: DataTypes.STRING(255), allowNull: false },
      bargainPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      customerPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      scheduledAt: { type: DataTypes.DATE, allowNull: false },
      anchorAt: { type: DataTypes.DATE, allowNull: false },
      lastIncomingMessageId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
      },
      sentAt: DataTypes.DATE,
      status: {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: "pending",
      },
    },
    {
      sequelize,
      modelName: "WhatsAppFollowUp",
      tableName: "whatsapp_follow_ups",
      underscored: true,
      indexes: [
        { name: "wa_follow_up_pending", fields: ["status", "scheduled_at"] },
        {
          name: "wa_follow_up_contact",
          fields: ["business_id", "customer_wa_id", "status"],
        },
      ],
    }
  );

  CompletedOrder.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      businessId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "businesses", key: "id" },
        onDelete: "CASCADE",
      },
      productId: DataTypes.INTEGER.UNSIGNED,
      productName: { type: DataTypes.STRING(255), allowNull: false },
      quantitySold: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 1,
      },
      unitPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      lineTotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      customerWaId: DataTypes.STRING(32),
      deliveryNote: DataTypes.TEXT,
      orderSource: {
        type: DataTypes.STRING(16),
        allowNull: true,
        defaultValue: "manual",
      },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "complete",
      },
      orderGroupId: DataTypes.STRING(36),
      orderPaymentProof: DataTypes.TEXT("medium"),
      deliveryPaymentProof: DataTypes.TEXT("medium"),
    },
    {
      sequelize,
      modelName: "CompletedOrder",
      tableName: "completed_orders",
      underscored: true,
    }
  );

  OrderActionLog.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      businessId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "businesses", key: "id" },
        onDelete: "CASCADE",
      },
      orderGroupId: DataTypes.STRING(36),
      leadOrderId: DataTypes.INTEGER.UNSIGNED,
      actionType: { type: DataTypes.STRING(64), allowNull: false },
      previousStatus: DataTypes.STRING(32),
      newStatus: DataTypes.STRING(32),
      performedBy: {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: "system",
      },
      performedByUserId: DataTypes.INTEGER.UNSIGNED,
      notes: DataTypes.TEXT,
      metadata: DataTypes.JSON,
    },
    {
      sequelize,
      modelName: "OrderActionLog",
      tableName: "order_action_logs",
      underscored: true,
      indexes: [
        {
          name: "order_action_logs_business_group",
          fields: ["business_id", "order_group_id"],
        },
        {
          name: "order_action_logs_business_created",
          fields: ["business_id", "created_at"],
        },
      ],
    }
  );

  CustomerOrderSession.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      businessId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "businesses", key: "id" },
        onDelete: "CASCADE",
      },
      customerWaId: {
        type: DataTypes.STRING(32),
        allowNull: false,
      },
      committed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      cartJson: DataTypes.TEXT,
      deliveryAddress: DataTypes.TEXT,
      deliveryPaymentProof: DataTypes.TEXT("medium"),
      orderPaymentProof: DataTypes.TEXT("medium"),
      orderGroupId: DataTypes.STRING(36),
      placedAt: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "CustomerOrderSession",
      tableName: "customer_order_sessions",
      underscored: true,
      indexes: [
        {
          name: "customer_order_session_business_customer",
          unique: true,
          fields: ["business_id", "customer_wa_id"],
        },
      ],
    }
  );

  BlockedContact.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      businessId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "businesses", key: "id" },
        onDelete: "CASCADE",
      },
      normalizedWaId: { type: DataTypes.STRING(32), allowNull: false },
      displayInput: DataTypes.STRING(64),
    },
    {
      sequelize,
      modelName: "BlockedContact",
      tableName: "blocked_contacts",
      underscored: true,
      indexes: [
        {
          name: "blocked_contacts_business_wa_unique",
          unique: true,
          fields: ["business_id", "normalized_wa_id"],
        },
      ],
    }
  );

  User.hasMany(Business, { foreignKey: "ownerUserId", as: "businesses" });
  Business.belongsTo(User, { foreignKey: "ownerUserId", as: "owner" });
  Business.hasMany(Product, { foreignKey: "businessId", as: "catalogProducts" });
  Product.belongsTo(Business, { foreignKey: "businessId", as: "business" });
  Business.hasMany(WhatsAppMessage, {
    foreignKey: "businessId",
    as: "messages",
  });
  WhatsAppMessage.belongsTo(Business, {
    foreignKey: "businessId",
    as: "business",
  });
  Business.hasMany(BlockedContact, {
    foreignKey: "businessId",
    as: "blockedContacts",
  });
  BlockedContact.belongsTo(Business, {
    foreignKey: "businessId",
    as: "business",
  });
  Business.hasMany(CompletedOrder, {
    foreignKey: "businessId",
    as: "completedOrders",
  });
  CompletedOrder.belongsTo(Business, {
    foreignKey: "businessId",
    as: "business",
  });
  Business.hasMany(OrderActionLog, {
    foreignKey: "businessId",
    as: "orderActionLogs",
  });
  OrderActionLog.belongsTo(Business, {
    foreignKey: "businessId",
    as: "business",
  });
  Business.hasMany(CustomerOrderSession, {
    foreignKey: "businessId",
    as: "orderSessions",
  });
  CustomerOrderSession.belongsTo(Business, {
    foreignKey: "businessId",
    as: "business",
  });
}
