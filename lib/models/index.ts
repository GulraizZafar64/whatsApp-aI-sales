import {
  Sequelize,
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import type { AiInstructionsRecord } from "@/lib/ai-instructions";

export class WhatsAppMessage extends Model<
  InferAttributes<WhatsAppMessage>,
  InferCreationAttributes<WhatsAppMessage>
> {
  declare id: CreationOptional<number>;
  declare businessPhoneNumberId: string | null;
  declare senderWaId: string;
  declare senderName: string | null;
  declare text: string;
  declare messageType: string;
  declare direction: string;
  declare status: string;
  /** For outgoing: who sent (`human` = dashboard/manual, `ai` = automation). */
  declare outgoingSource: string | null;
}

export class Business extends Model<
  InferAttributes<Business>,
  InferCreationAttributes<Business>
> {
  declare id: CreationOptional<number>;
  declare phoneNumberId: string;
  declare businessAccountId: string | null;
  declare whatsappToken: string | null;
  /** Meta webhook “Verify token” for this business (set at connect). */
  declare webhookVerifyToken: string | null;
  declare businessName: string | null;
  declare businessType: string | null;
  declare country: string | null;
  declare whatsappNumber: string | null;
  declare products: { name: string; price: string }[] | null;
  declare businessDescription: string | null;
  declare replyTone: string | null;
  declare userId: string | null;
  declare status: string | null;
  /** When true, dashboard prompts user to re-run Facebook Login (messaging scope not linked). */
  declare needsReconnect: CreationOptional<boolean>;
  /** Prompt snippets for AI (welcome, sales, order done, decline). */
  declare aiInstructions: AiInstructionsRecord | null;
  /** Anthropic Claude API key (optional; overrides env for this business). */
  declare anthropicApiKey: string | null;
}

/** Sellable product / catalog line with optional discount and bargaining floor. */
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
  /** When true, recording a sale reduces `quantity`. */
  declare subtractOnOrder: boolean;
  declare discountEnabled: boolean;
  /** Discount amount: percent (0–100) if discountIsPercent, else fixed currency off. */
  declare discountValue: string | null;
  declare discountIsPercent: boolean;
  /** Calendar date when the discount applies (server stores YYYY-MM-DD). */
  declare discountValidDate: string | null;
  declare brandName: string | null;
  /** JSON string: string[] hex or color names. */
  declare colorsJson: string | null;
  /** JSON string: string[] data URLs / base64 images. */
  declare imagesJson: string | null;
  /** Lowest acceptable price when bargaining (optional). */
  declare bargainingLowAmount: string | null;
}

/** WhatsApp contact blocked from messaging / shown in blacklist. */
export class BlockedContact extends Model<
  InferAttributes<BlockedContact>,
  InferCreationAttributes<BlockedContact>
> {
  declare id: CreationOptional<number>;
  declare businessId: number;
  /** Digits-only key for matching (same idea as inbox grouping). */
  declare normalizedWaId: string;
  /** Raw value the user entered (for display). */
  declare displayInput: string | null;
}

/** Scheduled bargain follow-up when a lead goes quiet after an AI product reply. */
export class WhatsAppFollowUp extends Model<
  InferAttributes<WhatsAppFollowUp>,
  InferCreationAttributes<WhatsAppFollowUp>
> {
  declare id: CreationOptional<number>;
  declare businessId: number;
  declare businessPhoneNumberId: string;
  declare customerWaId: string;
  declare contactRawWaId: string;
  declare productId: number;
  declare productName: string;
  declare bargainPrice: string;
  declare customerPrice: string;
  declare scheduledAt: Date;
  declare anchorAt: Date;
  /** Latest incoming message id when the follow-up was scheduled. */
  declare lastIncomingMessageId: number;
  declare sentAt: Date | null;
  declare status: string;
}

/** Logged when a catalog sale / order is marked done. */
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
}

export function initModels(sequelize: Sequelize): void {
  WhatsAppMessage.init(
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      businessPhoneNumberId: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },
      senderWaId: {
        type: DataTypes.STRING(32),
        allowNull: false,
      },
      senderName: {
        type: DataTypes.STRING(256),
        allowNull: true,
      },
      text: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      messageType: {
        type: DataTypes.STRING(32),
        allowNull: false,
      },
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
      outgoingSource: {
        type: DataTypes.STRING(16),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "WhatsAppMessage",
      tableName: "whatsapp_messages",
      underscored: true,
    }
  );

  Business.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      phoneNumberId: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
      },
      businessAccountId: DataTypes.STRING(64),
      whatsappToken: DataTypes.TEXT,
      webhookVerifyToken: DataTypes.STRING(64),
      businessName: DataTypes.STRING(255),
      businessType: DataTypes.STRING(128),
      country: DataTypes.STRING(128),
      whatsappNumber: DataTypes.STRING(64),
      products: DataTypes.JSON,
      businessDescription: DataTypes.TEXT,
      replyTone: DataTypes.STRING(64),
      userId: DataTypes.STRING(128),
      status: DataTypes.STRING(32),
      needsReconnect: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      aiInstructions: DataTypes.JSON,
      anthropicApiKey: DataTypes.TEXT,
    },
    {
      sequelize,
      modelName: "Business",
      tableName: "businesses",
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
      productName: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      productDescription: DataTypes.TEXT,
      price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
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
    {
      sequelize,
      modelName: "Product",
      tableName: "products",
      underscored: true,
    }
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
      businessPhoneNumberId: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      customerWaId: {
        type: DataTypes.STRING(32),
        allowNull: false,
      },
      contactRawWaId: {
        type: DataTypes.STRING(32),
        allowNull: false,
      },
      productId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      productName: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      bargainPrice: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      customerPrice: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      scheduledAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      anchorAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      lastIncomingMessageId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
      },
      sentAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
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
        {
          name: "wa_follow_up_pending",
          fields: ["status", "scheduled_at"],
        },
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
      productName: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      quantitySold: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 1,
      },
      unitPrice: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      lineTotal: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      customerWaId: {
        type: DataTypes.STRING(32),
        allowNull: true,
      },
      deliveryNote: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      orderSource: {
        type: DataTypes.STRING(16),
        allowNull: true,
        defaultValue: "manual",
      },
    },
    {
      sequelize,
      modelName: "CompletedOrder",
      tableName: "completed_orders",
      underscored: true,
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
      normalizedWaId: {
        type: DataTypes.STRING(32),
        allowNull: false,
      },
      displayInput: DataTypes.STRING(64),
    },
    {
      sequelize,
      modelName: "BlockedContact",
      tableName: "blocked_contacts",
      underscored: true,
    }
  );

  Business.hasMany(Product, { foreignKey: "businessId", as: "catalogProducts" });
  Product.belongsTo(Business, { foreignKey: "businessId", as: "business" });
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
}
