#!/usr/bin/env bash
# ==============================================================================
# Get My Moment — AWS S3 Production Media Infrastructure Provisioning (P1-BATCH-02)
# ==============================================================================
# Run this script with AWS Administrator credentials (e.g. via AWS CloudShell or local admin CLI)
# to provision the private S3 media bucket and attach the IAM instance profile to EC2.
# ==============================================================================

set -euo pipefail

ACCOUNT_ID="347447669372"
REGION="eu-north-1"
INSTANCE_ID="i-099c75fb4ec331e27"
BUCKET_NAME="getmymoment-media-prod-${ACCOUNT_ID}-eunorth1"
ROLE_NAME="GetMyMomentProductionMediaRole"
PROFILE_NAME="GetMyMomentProductionMediaProfile"
POLICY_NAME="GetMyMomentMediaS3AccessPolicy"

echo "=== 1. CREATING PRIVATE S3 MEDIA BUCKET: ${BUCKET_NAME} ==="
if aws s3api head-bucket --bucket "${BUCKET_NAME}" 2>/dev/null; then
    echo "Bucket ${BUCKET_NAME} already exists."
else
    aws s3api create-bucket \
        --bucket "${BUCKET_NAME}" \
        --region "${REGION}" \
        --create-bucket-configuration LocationConstraint="${REGION}"
    echo "Bucket created successfully."
fi

echo "=== 2. ENABLING S3 BLOCK PUBLIC ACCESS (ALL 4 SETTINGS) ==="
aws s3api put-public-access-block \
    --bucket "${BUCKET_NAME}" \
    --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

echo "=== 3. ENABLING DEFAULT SSE-S3 AES-256 ENCRYPTION ==="
aws s3api put-bucket-encryption \
    --bucket "${BUCKET_NAME}" \
    --server-side-encryption-configuration '{
        "Rules": [
            {
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "AES256"
                },
                "BucketKeyEnabled": true
            }
        ]
    }'

echo "=== 4. ENFORCING HTTPS/TLS TRANSPORT ONLY VIA BUCKET POLICY ==="
POLICY_JSON=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EnforceTLSRequestsOnly",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::${BUCKET_NAME}",
        "arn:aws:s3:::${BUCKET_NAME}/*"
      ],
      "Condition": {
        "Bool": {
          "aws:SecureTransport": "false"
        }
      }
    }
  ]
}
EOF
)
aws s3api put-bucket-policy --bucket "${BUCKET_NAME}" --policy "${POLICY_JSON}"

echo "=== 5. CREATING IAM ROLE: ${ROLE_NAME} ==="
TRUST_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
)

if aws iam get-role --role-name "${ROLE_NAME}" 2>/dev/null; then
    echo "IAM role ${ROLE_NAME} already exists."
else
    aws iam create-role \
        --role-name "${ROLE_NAME}" \
        --assume-role-policy-document "${TRUST_POLICY}" \
        --description "Least-privilege role for Get My Moment EC2 media access"
    echo "IAM role created."
fi

echo "=== 6. CREATING AND ATTACHING LEAST-PRIVILEGE IAM POLICY: ${POLICY_NAME} ==="
IAM_POLICY_JSON=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowMediaObjectOperations",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::${BUCKET_NAME}/*"
    },
    {
      "Sid": "AllowBucketMetadataRead",
      "Effect": "Allow",
      "Action": [
        "s3:GetBucketLocation",
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::${BUCKET_NAME}"
    }
  ]
}
EOF
)

POLICY_ARN="arn:aws:iam::${ACCOUNT_ID}:policy/${POLICY_NAME}"
if aws iam get-policy --policy-arn "${POLICY_ARN}" 2>/dev/null; then
    echo "IAM policy ${POLICY_NAME} already exists. Checking version limit..."
    VERSIONS=$(aws iam list-policy-versions --policy-arn "${POLICY_ARN}" --query 'Versions[?!IsDefaultVersion].VersionId' --output text 2>/dev/null || echo "")
    NUM_VERSIONS=$(echo "$VERSIONS" | wc -w)
    if [ "$NUM_VERSIONS" -ge 4 ]; then
        OLDEST_V=$(echo "$VERSIONS" | awk '{print $1}')
        echo "Pruning oldest non-default policy version: ${OLDEST_V}"
        aws iam delete-policy-version --policy-arn "${POLICY_ARN}" --version-id "${OLDEST_V}"
    fi
    echo "Creating new default policy version..."
    aws iam create-policy-version --policy-arn "${POLICY_ARN}" --policy-document "${IAM_POLICY_JSON}" --set-as-default
else
    echo "Creating IAM policy ${POLICY_NAME}..."
    aws iam create-policy \
        --policy-name "${POLICY_NAME}" \
        --policy-document "${IAM_POLICY_JSON}" \
        --description "Scoped least privilege access to Get My Moment media bucket"
fi

aws iam attach-role-policy --role-name "${ROLE_NAME}" --policy-arn "${POLICY_ARN}"

echo "=== 7. CREATING INSTANCE PROFILE & ATTACHING TO EC2: ${INSTANCE_ID} ==="
if aws iam get-instance-profile --instance-profile-name "${PROFILE_NAME}" 2>/dev/null; then
    echo "Instance profile ${PROFILE_NAME} exists."
else
    echo "Creating instance profile ${PROFILE_NAME}..."
    aws iam create-instance-profile --instance-profile-name "${PROFILE_NAME}"
    aws iam add-role-to-instance-profile --instance-profile-name "${PROFILE_NAME}" --role-name "${ROLE_NAME}"
    echo "Instance profile created and linked to role."
fi

echo "Checking existing instance profile associations on EC2 ${INSTANCE_ID}..."
ASSOC_ID=$(aws ec2 describe-iam-instance-profile-associations \
    --filters "Name=instance-id,Values=${INSTANCE_ID}" "Name=state,Values=associated,associating" \
    --query 'IamInstanceProfileAssociations[0].AssociationId' \
    --output text \
    --region "${REGION}" 2>/dev/null || echo "")

if [ -n "${ASSOC_ID}" ] && [ "${ASSOC_ID}" != "None" ]; then
    CURRENT_PROFILE_ARN=$(aws ec2 describe-iam-instance-profile-associations \
        --association-ids "${ASSOC_ID}" \
        --query 'IamInstanceProfileAssociations[0].IamInstanceProfile.Arn' \
        --output text \
        --region "${REGION}")
    if [[ "${CURRENT_PROFILE_ARN}" == *"${PROFILE_NAME}"* ]]; then
        echo "Instance profile ${PROFILE_NAME} is already associated with EC2 ${INSTANCE_ID} (Association ID: ${ASSOC_ID})."
    else
        echo "Replacing existing instance profile (${CURRENT_PROFILE_ARN}) with ${PROFILE_NAME}..."
        aws ec2 replace-iam-instance-profile-association \
            --association-id "${ASSOC_ID}" \
            --iam-instance-profile Name="${PROFILE_NAME}" \
            --region "${REGION}"
    fi
else
    echo "Associating instance profile ${PROFILE_NAME} with EC2 ${INSTANCE_ID}..."
    aws ec2 associate-iam-instance-profile \
        --instance-id "${INSTANCE_ID}" \
        --iam-instance-profile Name="${PROFILE_NAME}" \
        --region "${REGION}"
fi

echo "Verifying final association state..."
FINAL_STATE=$(aws ec2 describe-iam-instance-profile-associations \
    --filters "Name=instance-id,Values=${INSTANCE_ID}" \
    --query 'IamInstanceProfileAssociations[0].State' \
    --output text \
    --region "${REGION}")
echo "EC2 IAM Association State: ${FINAL_STATE}"

echo "=== PROVISIONING COMPLETE ==="
echo "Bucket: ${BUCKET_NAME}"
echo "Role: ${ROLE_NAME}"
echo "EC2: ${INSTANCE_ID}"


