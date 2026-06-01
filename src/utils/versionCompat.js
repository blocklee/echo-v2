// ECHO 协议 — 边版本约束兼容性检查

function parseSemver(v) {
  if (!v || typeof v !== 'string') return null;
  const m = v.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!m) return null;
  return {
    major: parseInt(m[1], 10) || 0,
    minor: parseInt(m[2], 10) || 0,
    patch: parseInt(m[3], 10) || 0,
  };
}

function compareSemver(a, b) {
  const av = parseSemver(a);
  const bv = parseSemver(b);
  if (!av || !bv) return 0;
  if (av.major !== bv.major) return av.major - bv.major;
  if (av.minor !== bv.minor) return av.minor - bv.minor;
  return av.patch - bv.patch;
}

export function checkVersionCompatibility(currentVersion, constraint) {
  if (!currentVersion || !constraint) {
    return { compatible: false, reason: '版本或约束为空' };
  }

  const cv = parseSemver(currentVersion);
  if (!cv) {
    return { compatible: false, reason: `当前版本 ${currentVersion} 无法解析` };
  }

  const { minVersion, maxVersion, constraintType = 'range' } = constraint;

  // exact
  if (constraintType === 'exact') {
    if (compareSemver(currentVersion, minVersion) === 0) {
      return { compatible: true };
    }
    return { compatible: false, reason: `要求精确版本 ${minVersion}，当前 ${currentVersion}` };
  }

  // min-only
  if (constraintType === 'min-only') {
    if (minVersion && compareSemver(currentVersion, minVersion) < 0) {
      return { compatible: false, reason: `最低要求 ${minVersion}，当前 ${currentVersion}` };
    }
    return { compatible: true };
  }

  // max-only
  if (constraintType === 'max-only') {
    if (maxVersion && compareSemver(currentVersion, maxVersion) > 0) {
      return { compatible: false, reason: `最高允许 ${maxVersion}，当前 ${currentVersion}` };
    }
    return { compatible: true };
  }

  // range (default)
  if (minVersion && compareSemver(currentVersion, minVersion) < 0) {
    return { compatible: false, reason: `最低要求 ${minVersion}，当前 ${currentVersion}` };
  }
  if (maxVersion && compareSemver(currentVersion, maxVersion) > 0) {
    return { compatible: false, reason: `最高允许 ${maxVersion}，当前 ${currentVersion}` };
  }
  return { compatible: true };
}

export const ALPHA_7_CONSTRAINT = {
  minVersion: '1.0.0',
  maxVersion: '2.0.0',
  constraintType: 'range',
  declaredAtBlock: 2704473,
  label: 'ALPHA-7 边伦理承诺',
};

export function checkAlpha7Compatibility(currentVersion) {
  return checkVersionCompatibility(currentVersion, ALPHA_7_CONSTRAINT);
}
