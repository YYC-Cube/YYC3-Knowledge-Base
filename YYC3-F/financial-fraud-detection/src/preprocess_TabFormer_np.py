# Copyright (c) 2025, NVIDIA CORPORATION.
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.


# # Credit Card Transaction Data Cleanup and Prep for Node Prediction
#
# This source code shows the steps for cleanup and preparing the credit card transaction data 
# for node prediction (fraud transaction detection) using the financial-fraud-training container.
#
# ### The dataset:
#  * IBM TabFormer: https://github.com/IBM/TabFormer
#  * Released under an Apache 2.0 license
#
# Contains 24M records with 15 fields, one field being the "is fraud" label which we use for training.
#
# ### Goals
# The goal is to:
#  * Cleanup the data
#  * Encode categorical fields
#  * Create a graph structure with:
#    * User nodes (with features)
#    * Transaction nodes (with features and labels) - TARGET FOR PREDICTION
#    * Merchant nodes (with features)
#    * Edges WITHOUT attributes:
#      - user -> transaction
#      - transaction -> merchant
#  * Split data into train/val/test sets
#
# ### Graph formation for Node Prediction
# This preprocessing creates a heterogeneous graph where:
# - Transactions are nodes that we want to classify (fraudulent or not)
# - Users are nodes with features
# - Merchants are nodes with features
# - Edges connect: user -> transaction -> merchant (no edge attributes)
#
# -----

import os
import cudf
import numpy as np
import pandas as pd
import scipy.stats as ss
import networkx as nx
import matplotlib.pyplot as plt
from category_encoders import BinaryEncoder
from scipy.stats import pointbiserialr
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, RobustScaler


COL_USER = "User"
COL_CARD = "Card"
COL_AMOUNT = "Amount"
COL_MCC = "MCC"
COL_TIME = "Time"
COL_DAY = "Day"
COL_MONTH = "Month"
COL_YEAR = "Year"

COL_MERCHANT = "Merchant"
COL_STATE = "State"
COL_CITY = "City"
COL_ZIP = "Zip"
COL_ERROR = "Errors"
COL_CHIP = "Chip"
COL_FRAUD = "Fraud"
COL_TRANSACTION_ID = "Tx_ID"
COL_MERCHANT_ID = "Merchant_ID"
COL_USER_ID = "User_ID"

UNKNOWN_STRING_MARKER = "XX"
UNKNOWN_ZIP_CODE = 0

COL_GRAPH_SRC = "src"
COL_GRAPH_DST = "dst"
MERCHANT_AND_USER_COLS = [COL_MERCHANT, COL_CARD, COL_MCC]


def cramers_v(x, y):
    """
    Compute correlation of categorical field x with target y.
    See https://en.wikipedia.org/wiki/Cram%C3%A9r's_V
    """
    confusion_matrix = cudf.crosstab(x, y).to_numpy()
    chi2 = ss.chi2_contingency(confusion_matrix)[0]
    n = confusion_matrix.sum().sum()
    r, k = confusion_matrix.shape
    return np.sqrt(chi2 / (n * (min(k - 1, r - 1))))


def create_feature_mask(columns, start_mask_id=0):
    """Create feature mask mapping for Shapley value computation."""
    mask_mapping = {}
    mask_values = []
    current_mask = start_mask_id

    for col in columns:
        if "_" in col:
            base_feature = col.split("_")[0]
        else:
            base_feature = col

        if base_feature not in mask_mapping:
            mask_mapping[base_feature] = current_mask
            current_mask += 1

        mask_values.append(mask_mapping[base_feature])

    feature_mask = np.array(mask_values)
    return mask_mapping, feature_mask


def preprocess_data(tabformer_base_path):
    """
    Preprocess TabFormer data for node prediction (fraud transaction detection).
    
    Creates a graph with:
    - User nodes (with features)
    - Transaction nodes (TARGET for prediction - have fraud labels)
    - Merchant nodes (with features)
    - Edges: user->transaction, transaction->merchant (NO edge attributes)
    """

    # Whether we should under-sample majority class (i.e. non-fraud transactions)
    under_sample = True

    # Ratio of fraud and non-fraud transactions in case we under-sample the majority class
    fraud_ratio = 0.1

    tabformer_raw_file_path = os.path.join(
        tabformer_base_path, "raw", "card_transaction.v1.csv"
    )
    tabformer_gnn = os.path.join(tabformer_base_path, "gnn_np")

    if not os.path.exists(tabformer_gnn):
        os.makedirs(tabformer_gnn)

    # Read the dataset
    print("Reading raw data...")
    data = cudf.read_csv(tabformer_raw_file_path)

    _ = data.rename(
        columns={
            "Merchant Name": COL_MERCHANT,
            "Merchant State": COL_STATE,
            "Merchant City": COL_CITY,
            "Errors?": COL_ERROR,
            "Use Chip": COL_CHIP,
            "Is Fraud?": COL_FRAUD,
        },
        inplace=True,
    )

    # Handle missing values
    assert UNKNOWN_STRING_MARKER not in set(data[COL_STATE].unique().to_pandas())
    assert UNKNOWN_STRING_MARKER not in set(data[COL_ERROR].unique().to_pandas())
    assert float(0) not in set(data[COL_ZIP].unique().to_pandas())
    assert 0 not in set(data[COL_ZIP].unique().to_pandas())

    data[COL_STATE] = data[COL_STATE].fillna(UNKNOWN_STRING_MARKER)
    data[COL_ERROR] = data[COL_ERROR].fillna(UNKNOWN_STRING_MARKER)
    data[COL_ZIP] = data[COL_ZIP].fillna(UNKNOWN_ZIP_CODE)

    assert data.isnull().sum().sum() == 0

    # Clean up the Amount field
    data[COL_AMOUNT] = data[COL_AMOUNT].str.replace("$", "").astype("float")

    # Change the 'Fraud' values to be integer
    fraud_to_binary = {"No": 0, "Yes": 1}
    data[COL_FRAUD] = data[COL_FRAUD].map(fraud_to_binary).astype("int8")

    # Remove ',' in error descriptions
    data[COL_ERROR] = data[COL_ERROR].str.replace(",", "")

    # Split the time column into hours and minutes
    T = data[COL_TIME].str.split(":", expand=True)
    T[0] = T[0].astype("int32")
    T[1] = T[1].astype("int32")
    data[COL_TIME] = (T[0] * 60) + T[1]
    data[COL_TIME] = data[COL_TIME].astype("int32")
    del T

    # Convert Merchant column to str type
    data[COL_MERCHANT] = data[COL_MERCHANT].astype("str")

    # Combine User and Card to generate unique numbers
    data[COL_CARD] = data[COL_USER] * len(data[COL_CARD].unique()) + data[COL_CARD]
    data[COL_CARD] = data[COL_CARD].astype("int")

    # Convert to pandas for encoding
    data = data.to_pandas()

    # Collect unique merchant, card and MCC for encoding
    data_ids = pd.DataFrame()
    nr_unique_card = data[COL_CARD].unique().shape[0]
    nr_unique_merchant = data[COL_MERCHANT].unique().shape[0]
    nr_unique_mcc = data[COL_MCC].unique().shape[0]
    nr_elements = max(nr_unique_merchant, nr_unique_card)

    data_ids[COL_CARD] = [data[COL_CARD][0]] * nr_elements
    data_ids[COL_MERCHANT] = [data[COL_MERCHANT][0]] * nr_elements
    data_ids[COL_MCC] = [data[COL_MCC][0]] * nr_elements

    data_ids.loc[np.arange(nr_unique_card), COL_CARD] = data[COL_CARD].unique()
    data_ids.loc[np.arange(nr_unique_merchant), COL_MERCHANT] = data[
        COL_MERCHANT
    ].unique()
    data_ids.loc[np.arange(nr_unique_mcc), COL_MCC] = data[COL_MCC].unique()

    data_ids = data_ids[MERCHANT_AND_USER_COLS].astype("category")

    # Binary encoder for IDs
    id_bin_encoder = Pipeline(
        steps=[
            ("binary", BinaryEncoder(handle_missing="value", handle_unknown="value"))
        ]
    )

    id_transformer = ColumnTransformer(
        transformers=[
            ("binary", id_bin_encoder, MERCHANT_AND_USER_COLS),
        ],
        remainder="passthrough",
    )

    pd.set_option("future.no_silent_downcasting", True)
    id_transformer = id_transformer.fit(data_ids)

    preprocessed_id_data_raw = id_transformer.transform(
        data[MERCHANT_AND_USER_COLS].astype("category")
    )

    columns_of_transformed_id_data = list(
        map(
            lambda name: name.split("__")[1],
            list(id_transformer.get_feature_names_out(MERCHANT_AND_USER_COLS)),
        )
    )

    id_col_type_mapping = {}
    for col in columns_of_transformed_id_data:
        if col.split("_")[0] in MERCHANT_AND_USER_COLS:
            id_col_type_mapping[col] = "int8"

    preprocessed_id_data = pd.DataFrame(
        preprocessed_id_data_raw, columns=columns_of_transformed_id_data
    )

    del data_ids
    del preprocessed_id_data_raw

    data = pd.concat(
        [data.reset_index(drop=True), preprocessed_id_data.reset_index(drop=True)],
        axis=1,
    )

    # Compute correlation
    print("Computing correlations with fraud label...")
    sparse_factor = 1
    columns_to_compute_corr = [
        COL_CARD,
        COL_CHIP,
        COL_ERROR,
        COL_STATE,
        COL_CITY,
        COL_ZIP,
        COL_MCC,
        COL_MERCHANT,
        COL_USER,
        COL_DAY,
        COL_MONTH,
        COL_YEAR,
    ]
    for c1 in columns_to_compute_corr:
        for c2 in [COL_FRAUD]:
            coff = 100 * cramers_v(data[c1][::sparse_factor], data[c2][::sparse_factor])
            print("Correlation ({}, {}) = {:6.2f}%".format(c1, c2, coff))

    for col in [COL_TIME, COL_AMOUNT]:
        r_pb, p_value = pointbiserialr(data[COL_FRAUD], data[col])
        print("r_pb ({}) = {:3.2f} with p_value {:3.2f}".format(col, r_pb, p_value))

    numerical_predictors = [COL_AMOUNT]
    nominal_predictors = [
        COL_ERROR,
        COL_CARD,
        COL_CHIP,
        COL_CITY,
        COL_ZIP,
        COL_MCC,
        COL_MERCHANT,
    ]

    predictor_columns = numerical_predictors + nominal_predictors
    target_column = [COL_FRAUD]

    # Remove duplicate non-fraud data points
    fraud_data = data[data[COL_FRAUD] == 1]
    data = data[data[COL_FRAUD] == 0]
    data = data.drop_duplicates(subset=nominal_predictors)
    data = pd.concat([data, fraud_data])

    # Under-sample if needed
    if under_sample:
        fraud_df = data[data[COL_FRAUD] == 1]
        non_fraud_df = data[data[COL_FRAUD] == 0]
        nr_non_fraud_samples = min(
            (len(data) - len(fraud_df)), int(len(fraud_df) / fraud_ratio)
        )
        data = pd.concat(
            [fraud_df, non_fraud_df.sample(nr_non_fraud_samples, random_state=42)]
        )

    predictor_columns = list(set(predictor_columns) - set(MERCHANT_AND_USER_COLS))
    nominal_predictors = list(set(nominal_predictors) - set(MERCHANT_AND_USER_COLS))

    data = data.sample(frac=1, random_state=42).reset_index(drop=True)

    # Split by year
    training_idx = data[COL_YEAR] < 2018
    validation_idx = data[COL_YEAR] == 2018
    test_idx = data[COL_YEAR] > 2018

    # Scale numerical columns and encode categorical columns
    pdf_training = data[training_idx][predictor_columns + target_column]

    # Use one-hot encoding for columns with <= 8 categories
    columns_for_binary_encoding = []
    columns_for_one_hot_encoding = []
    for col in nominal_predictors:
        if len(data[col].unique()) <= 8:
            columns_for_one_hot_encoding.append(col)
        else:
            columns_for_binary_encoding.append(col)

    assert (training_idx.sum() + validation_idx.sum() + test_idx.sum()) == data.shape[0]

    pdf_training[nominal_predictors] = pdf_training[nominal_predictors].astype(
        "category"
    )

    # Encoders
    bin_encoder = Pipeline(
        steps=[
            ("binary", BinaryEncoder(handle_missing="value", handle_unknown="value"))
        ]
    )
    one_hot_encoder = Pipeline(steps=[("onehot", OneHotEncoder())])
    robust_scaler = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("robust", RobustScaler()),
        ],
    )

    transformer = ColumnTransformer(
        transformers=[
            ("binary", bin_encoder, columns_for_binary_encoding),
            ("onehot", one_hot_encoder, columns_for_one_hot_encoding),
            ("robust", robust_scaler, [COL_AMOUNT]),
        ],
        remainder="passthrough",
    )

    pd.set_option("future.no_silent_downcasting", True)
    transformer = transformer.fit(pdf_training[predictor_columns])

    columns_of_transformed_txs = list(
        map(
            lambda name: name.split("__")[1],
            list(transformer.get_feature_names_out(predictor_columns)),
        )
    )

    type_mapping = {}
    for col in columns_of_transformed_txs:
        if col.split("_")[0] in nominal_predictors:
            type_mapping[col] = "int8"
        elif col in numerical_predictors:
            type_mapping[col] = "float"
        elif col in target_column:
            type_mapping[col] = data.dtypes.to_dict()[col]

    # Delete dataFrames
    del pdf_training

    print("Processing GNN data for node prediction...")

    # Use training + validation for GNN training
    data_all = data.copy()
    data = pd.concat([data[training_idx], data[validation_idx]])
    data.reset_index(inplace=True, drop=True)

    # Assign consecutive IDs
    data[COL_TRANSACTION_ID] = data.index

    merchant_name_to_id = dict(
        zip(data[COL_MERCHANT].unique(), np.arange(len(data[COL_MERCHANT].unique())))
    )
    data[COL_MERCHANT_ID] = data[COL_MERCHANT].map(merchant_name_to_id)

    id_to_consecutive_id = dict(
        zip(data[COL_CARD].unique(), np.arange(len(data[COL_CARD].unique())))
    )
    data[COL_USER_ID] = data[COL_CARD].map(id_to_consecutive_id)

    NR_USERS = data[COL_USER_ID].max() + 1
    NR_MXS = data[COL_MERCHANT_ID].max() + 1
    NR_TXS = data[COL_TRANSACTION_ID].max() + 1

    print(f"Training + Validation: {NR_USERS} users, {NR_MXS} merchants, {NR_TXS} transactions")

    # Separate user and merchant features
    user_feature_columns = []
    mx_feature_columns = []
    for c in columns_of_transformed_id_data:
        if c.startswith("Card"):
            user_feature_columns.append(c)
        else:
            mx_feature_columns.append(c)

    # Create transaction features
    transaction_feature_df = pd.DataFrame(
        transformer.transform(data[predictor_columns]),
        columns=columns_of_transformed_txs,
    ).astype(type_mapping)

    # Transaction features
    out_path = os.path.join(tabformer_gnn, "nodes/transaction.csv")
    if not os.path.exists(os.path.dirname(out_path)):
        os.makedirs(os.path.dirname(out_path))
    transaction_feature_df.to_csv(out_path, header=True, index=False)

    # Transaction labels (fraud/not fraud) - TARGET FOR PREDICTION
    transaction_labels = data[COL_FRAUD]
    out_path = os.path.join(tabformer_gnn, "nodes/transaction_label.csv")
    transaction_labels.to_frame(name="label").to_csv(out_path, header=True, index=False)

    # User features
    data_user = data[[COL_MERCHANT, COL_MCC, COL_CARD]].drop_duplicates(
        subset=[COL_CARD]
    )
    data_user[COL_USER_ID] = data_user[COL_CARD].map(id_to_consecutive_id)
    data_user_sorted = data_user.sort_values(by=COL_USER_ID)

    preprocessed_user_data = pd.DataFrame(
        id_transformer.transform(data_user_sorted[MERCHANT_AND_USER_COLS]),
        columns=columns_of_transformed_id_data,
    )[user_feature_columns]

    out_path = os.path.join(tabformer_gnn, "nodes/user.csv")
    preprocessed_user_data.to_csv(out_path, header=True, index=False)

    # Merchant features
    data_merchant = data[[COL_MERCHANT, COL_MCC, COL_CARD]].drop_duplicates(
        subset=[COL_MERCHANT]
    )
    data_merchant[COL_MERCHANT_ID] = data_merchant[COL_MERCHANT].map(
        merchant_name_to_id
    )
    data_merchant_sorted = data_merchant.sort_values(by=COL_MERCHANT_ID)

    preprocessed_merchant_data = pd.DataFrame(
        id_transformer.transform(data_merchant_sorted[MERCHANT_AND_USER_COLS]),
        columns=columns_of_transformed_id_data,
    )[mx_feature_columns]

    out_path = os.path.join(tabformer_gnn, "nodes/merchant.csv")
    preprocessed_merchant_data.to_csv(out_path, header=True, index=False)

    # Create edges: user -> transaction (NO attributes)
    U_2_T = cudf.DataFrame()
    U_2_T[COL_GRAPH_SRC] = data[COL_USER_ID]
    U_2_T[COL_GRAPH_DST] = data[COL_TRANSACTION_ID]

    out_path = os.path.join(tabformer_gnn, "edges/user_to_transaction.csv")
    if not os.path.exists(os.path.dirname(out_path)):
        os.makedirs(os.path.dirname(out_path))
    U_2_T.to_csv(out_path, header=True, index=False)

    # Create edges: transaction -> merchant (NO attributes)
    T_2_M = cudf.DataFrame()
    T_2_M[COL_GRAPH_SRC] = data[COL_TRANSACTION_ID]
    T_2_M[COL_GRAPH_DST] = data[COL_MERCHANT_ID]

    out_path = os.path.join(tabformer_gnn, "edges/transaction_to_merchant.csv")
    T_2_M.to_csv(out_path, header=True, index=False)

    print("Saved training data")

    # Test data
    data = data_all[test_idx].copy()
    data.reset_index(inplace=True, drop=True)
    data[COL_TRANSACTION_ID] = data.index

    merchant_name_to_id = dict(
        zip(data[COL_MERCHANT].unique(), np.arange(len(data[COL_MERCHANT].unique())))
    )
    data[COL_MERCHANT_ID] = data[COL_MERCHANT].map(merchant_name_to_id)

    id_to_consecutive_id = dict(
        zip(data[COL_CARD].unique(), np.arange(len(data[COL_CARD].unique())))
    )
    data[COL_USER_ID] = data[COL_CARD].map(id_to_consecutive_id)

    NR_USERS = data[COL_USER_ID].max() + 1
    NR_MXS = data[COL_MERCHANT_ID].max() + 1
    NR_TXS = data[COL_TRANSACTION_ID].max() + 1

    print(f"Test: {NR_USERS} users, {NR_MXS} merchants, {NR_TXS} transactions")

    # Transaction features
    transaction_feature_df = pd.DataFrame(
        transformer.transform(data[predictor_columns]),
        columns=columns_of_transformed_txs,
    ).astype(type_mapping)

    out_path = os.path.join(tabformer_gnn, "test_gnn/nodes/transaction.csv")
    if not os.path.exists(os.path.dirname(out_path)):
        os.makedirs(os.path.dirname(out_path))
    transaction_feature_df.to_csv(out_path, header=True, index=False)

    # Transaction labels (fraud/not fraud) - TARGET FOR PREDICTION
    transaction_labels = data[COL_FRAUD]
    out_path = os.path.join(tabformer_gnn, "test_gnn/nodes/transaction_label.csv")
    transaction_labels.to_frame(name="label").to_csv(out_path, header=True, index=False)

    # User features
    data_user = data[[COL_MERCHANT, COL_MCC, COL_CARD]].drop_duplicates(
        subset=[COL_CARD]
    )
    data_user[COL_USER_ID] = data_user[COL_CARD].map(id_to_consecutive_id)
    data_user_sorted = data_user.sort_values(by=COL_USER_ID)

    preprocessed_user_data = pd.DataFrame(
        id_transformer.transform(data_user_sorted[MERCHANT_AND_USER_COLS]),
        columns=columns_of_transformed_id_data,
    )[user_feature_columns]

    out_path = os.path.join(tabformer_gnn, "test_gnn/nodes/user.csv")
    preprocessed_user_data.to_csv(out_path, header=True, index=False)

    # Merchant features
    data_merchant = data[[COL_MERCHANT, COL_MCC, COL_CARD]].drop_duplicates(
        subset=[COL_MERCHANT]
    )
    data_merchant[COL_MERCHANT_ID] = data_merchant[COL_MERCHANT].map(
        merchant_name_to_id
    )
    data_merchant_sorted = data_merchant.sort_values(by=COL_MERCHANT_ID)

    preprocessed_merchant_data = pd.DataFrame(
        id_transformer.transform(data_merchant_sorted[MERCHANT_AND_USER_COLS]),
        columns=columns_of_transformed_id_data,
    )[mx_feature_columns]

    out_path = os.path.join(tabformer_gnn, "test_gnn/nodes/merchant.csv")
    preprocessed_merchant_data.to_csv(out_path, header=True, index=False)

    # Edges: user -> transaction
    U_2_T = cudf.DataFrame()
    U_2_T[COL_GRAPH_SRC] = data[COL_USER_ID]
    U_2_T[COL_GRAPH_DST] = data[COL_TRANSACTION_ID]

    out_path = os.path.join(tabformer_gnn, "test_gnn/edges/user_to_transaction.csv")
    if not os.path.exists(os.path.dirname(out_path)):
        os.makedirs(os.path.dirname(out_path))
    U_2_T.to_csv(out_path, header=True, index=False)

    # Edges: transaction -> merchant
    T_2_M = cudf.DataFrame()
    T_2_M[COL_GRAPH_SRC] = data[COL_TRANSACTION_ID]
    T_2_M[COL_GRAPH_DST] = data[COL_MERCHANT_ID]

    out_path = os.path.join(tabformer_gnn, "test_gnn/edges/transaction_to_merchant.csv")
    T_2_M.to_csv(out_path, header=True, index=False)

    print("Saved test data")

    # Create feature masks for all node types
    user_mask_map, user_mask = create_feature_mask(user_feature_columns, 0)
    mx_mask_map, mx_mask = create_feature_mask(
        mx_feature_columns, np.max(user_mask) + 1
    )
    tx_mask_map, tx_mask = create_feature_mask(
        columns_of_transformed_txs, np.max(mx_mask) + 1
    )

    np.savetxt(
        os.path.join(tabformer_gnn, "test_gnn/nodes/user_feature_mask.csv"),
        user_mask,
        delimiter=",",
        fmt="%d",
    )
    np.savetxt(
        os.path.join(tabformer_gnn, "test_gnn/nodes/merchant_feature_mask.csv"),
        mx_mask,
        delimiter=",",
        fmt="%d",
    )
    np.savetxt(
        os.path.join(tabformer_gnn, "test_gnn/nodes/transaction_feature_mask.csv"),
        tx_mask,
        delimiter=",",
        fmt="%d",
    )

    print("Preprocessing complete!")
    return user_mask_map, mx_mask_map, tx_mask_map


def load_hetero_graph(base):
    """
    Load heterogeneous graph data for node prediction.
    Reads node features, labels, and edge connectivity (no edge attributes).
    """
    nodes_dir = os.path.join(base, "nodes")
    edges_dir = os.path.join(base, "edges")

    out = {}

    # Load node features and labels
    if os.path.isdir(nodes_dir):
        for fname in os.listdir(nodes_dir):
            if fname.lower().endswith(".csv") and not fname.lower().endswith(
                "_feature_mask.csv"
            ) and not fname.lower().endswith("_label.csv"):
                node_name = fname[: -len(".csv")]
                node_path = os.path.join(nodes_dir, fname)
                node_df = pd.read_csv(node_path)
                out[f"x_{node_name}"] = node_df.to_numpy(dtype=np.float32)

                # Load feature mask if exists
                mask_fname = f"{node_name}_feature_mask.csv"
                mask_path = os.path.join(nodes_dir, mask_fname)
                if os.path.exists(mask_path):
                    mask_df = pd.read_csv(mask_path, header=None)
                    feature_mask = mask_df.to_numpy(dtype=np.int32).ravel()
                else:
                    feature_mask = np.zeros(node_df.shape[1], dtype=np.int32)
                out[f"feature_mask_{node_name}"] = feature_mask

            # Load node labels
            elif fname.lower().endswith("_label.csv"):
                node_name = fname[: -len("_label.csv")]
                label_path = os.path.join(nodes_dir, fname)
                label_df = pd.read_csv(label_path)
                out[f"node_label_{node_name}"] = label_df.to_numpy(dtype=np.int32).ravel()
                print(f"Loaded labels for {node_name} nodes: {out[f'node_label_{node_name}'].shape}")

    # Load edges (no attributes)
    if os.path.isdir(edges_dir):
        for fname in os.listdir(edges_dir):
            if not fname.lower().endswith(".csv"):
                continue
            edge_name = fname[: -len(".csv")]
            path = os.path.join(edges_dir, fname)
            df = pd.read_csv(path)
            out[f"edge_index_{edge_name}"] = df.to_numpy(dtype=np.int64).T

    return out


def plot_graph_structure(test_data_path):
    """Visualize a small subgraph of the node prediction graph."""
    data = load_hetero_graph(test_data_path)
    
    # Create a NetworkX graph for visualization
    G = nx.Graph()
    
    # Add sample edges (limit for visualization)
    max_edges = 50
    
    if "edge_index_user_to_transaction" in data:
        edges_u2t = data["edge_index_user_to_transaction"]
        for i in range(min(edges_u2t.shape[1], max_edges)):
            u, t = edges_u2t[:, i]
            G.add_edge(f"U{u}", f"T{t}")
    
    if "edge_index_transaction_to_merchant" in data:
        edges_t2m = data["edge_index_transaction_to_merchant"]
        for i in range(min(edges_t2m.shape[1], max_edges)):
            t, m = edges_t2m[:, i]
            G.add_edge(f"T{t}", f"M{m}")
    
    # Draw the graph
    plt.figure(figsize=(12, 8))
    pos = nx.spring_layout(G, k=2, iterations=50)
    
    # Color nodes by type
    node_colors = []
    for node in G.nodes():
        if node.startswith('U'):
            node_colors.append('lightblue')
        elif node.startswith('T'):
            node_colors.append('lightgreen')
        else:
            node_colors.append('lightcoral')
    
    nx.draw(G, pos, node_color=node_colors, with_labels=True, 
            node_size=300, font_size=8, alpha=0.7)
    plt.title("Sample Graph Structure: Users (blue) -> Transactions (green) -> Merchants (red)")
    plt.axis('off')
    plt.tight_layout()
    plt.show()

