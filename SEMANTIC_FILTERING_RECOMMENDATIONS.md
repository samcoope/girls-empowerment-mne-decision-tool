# Semantic Filtering Recommendations

**Date:** 2026-02-05
**Issue:** Percentage-based matching can suggest semantically invalid methods
**Impact:** Methods appear in Good Alternatives/Stretch Options that don't make logical sense

---

## 🔍 Problem Statement

Current filtering uses **percentage-based matching** only:
- ✅ Counts how many filters match
- ❌ Doesn't check if the match makes semantic sense

**Example Violation Found:**
- User selects: **"Individual"** SEM level
- System suggests: **"Administrative Data"** (67% match) in Stretch Options
- **Problem:** Administrative Data is institutional-only and CANNOT measure individual outcomes

---

## 📊 Identified Semantic Violations (9 Rules)

### Category 1: SEM Level Incompatibilities (5 violations)

| Method | Problem | Should NEVER Appear For |
|--------|---------|------------------------|
| **Administrative Data** | Institutional-only | Individual, Interpersonal, Community |
| **Policy Implementation Tracking** | Institutional-only | Individual, Interpersonal, Community |
| **Community Resource Mapping** | Community/Institutional | Individual-only queries |
| **Focus Group Discussions** | Interpersonal/Community | Individual-only queries |
| **Storytelling Circles** | Interpersonal/Community | Individual-only queries |

**Rationale:** These methods fundamentally operate at different ecological levels and cannot measure outcomes at incompatible levels.

---

### Category 2: Technology Incompatibilities (2 violations)

| Method | Problem | Should NEVER Appear For |
|--------|---------|------------------------|
| **Participatory Video** | Requires HIGH tech | Low tech access |
| **Social Listening** | Requires HIGH tech | Low tech access |

**Rationale:** These methods require consistent, reliable technology infrastructure.

**Current Data Issue:** These methods are currently marked as working with "Low" tech - this needs correction.

---

### Category 3: Cultural Incompatibilities (2 violations)

| Method | Problem | Should NEVER Appear For |
|--------|---------|------------------------|
| **Photovoice** | Visual documentation | High cultural restrictiveness |
| **Participatory Video** | Visual documentation | High cultural restrictiveness |

**Rationale:** Visual documentation of girls is dangerous in highly restrictive cultural contexts.

**Current Data Issue:** These methods are currently marked as working with "High" cultural restrictiveness - this needs correction.

---

## 🧪 Actual Violations Found in Testing

### Scenario: Individual + Conflict + Low Resources

**User wants:** Individual-level measurement in conflict zone with low resources

**System suggests (Stretch Options):**
- ❌ **Storytelling Circles** (67% match) - GROUP method, not individual
- ❌ **Administrative Data** (67% match) - INSTITUTIONAL only, not individual

**Why this is wrong:**
- Storytelling Circles = group discussion method (Interpersonal/Community level)
- Administrative Data = institutional records (cannot measure individual girls' outcomes)
- User explicitly needs Individual-level measurement

---

## 💡 Recommended Solutions

### **Option 1: Hard Exclusion Rules (Recommended)**

Implement semantic validation that **completely excludes** methods when:

```javascript
function isSemanticMismatch(method, userSelections) {
  // Rule 1: SEM Level hard blocks
  if (userSelections.sem_level) {
    const methodSemLevels = method.attributes.sem_level || [];
    const userSemLevels = userSelections.sem_level;

    // Check if method supports ANY of the user's selected SEM levels
    const hasOverlap = userSemLevels.some(level => methodSemLevels.includes(level));

    if (!hasOverlap && methodSemLevels.length > 0) {
      return true; // Semantic mismatch - method doesn't support any selected SEM level
    }
  }

  // Rule 2: Digital methods require at least Medium tech
  const digitalMethods = [
    'Quantitative Surveys (Digital/Online)',
    'Digital Diaries/Journals',
    'Participatory Video/Digital Storytelling',
    'Real-Time Polling (U-Report)',
    'Social Listening/Digital Traces'
  ];

  if (digitalMethods.includes(method.name)) {
    const userTech = userSelections.participants_access_to_technology_eg_phones_internet || [];
    if (userTech.includes('Low') && userTech.length === 1) {
      return true; // Digital method with ONLY Low tech selected
    }
  }

  // Rule 3: Visibility methods can't work in High cultural restrictiveness
  const visibilityMethods = ['Photovoice', 'Participatory Video/Digital Storytelling'];

  if (visibilityMethods.includes(method.name)) {
    const userCultural = userSelections.level_of_cultural_restrictiveness || [];
    if (userCultural.includes('High') && userCultural.length === 1) {
      return true; // Visibility method with ONLY High restriction selected
    }
  }

  return false; // No semantic mismatch
}
```

**Apply this in the groupMethodsByFit() function:**

```javascript
// Inside groupMethodsByFit(), after calculating matchPercentage:

// Check for semantic mismatch BEFORE categorizing
if (isSemanticMismatch(method, state.userSelections)) {
  // Skip this method entirely - don't add to any tier
  continue;
}

// Only if semantically valid, proceed with percentage-based categorization
if (matchPercentage === 100) {
  groups.bestFit.push(methodData);
} else if (matchPercentage >= 80) {
  groups.goodAlternatives.push(methodData);
} // ...etc
```

---

### **Option 2: Warning Labels**

Instead of excluding, show methods but add warning:

```javascript
{
  method: method,
  mismatches: mismatches,
  matchPercentage: matchPercentage,
  semanticWarning: "⚠️ This method operates at a different level than selected"
}
```

**Not recommended** - adds complexity and may confuse users.

---

### **Option 3: Fix Data First**

Correct the data issues:

**Change 1: Remove "Low" from visibility methods**
- Photovoice: Remove "High" cultural restrictiveness
- Participatory Video: Remove "High" cultural restrictiveness, "Low" tech

**Change 2: Already correct**
- Administrative Data: Only Institutional ✅
- Policy Implementation Tracking: Only Institutional ✅
- Longitudinal methods: Only Stable ✅

---

## 🎯 Recommended Implementation Plan

### Phase 1: Data Corrections (Quick wins)

1. **Photovoice**: Remove "High" cultural restrictiveness
2. **Participatory Video**: Remove "High" cultural restrictiveness
3. **Participatory Video**: Already done - removed "Low" and "Medium" tech
4. **Social Listening**: Remove "Low" tech

**Impact:** Fixes 4 of 9 violations through data alone.

---

### Phase 2: SEM Level Hard Blocks (Code change)

Add semantic validation for SEM Level mismatches:

```javascript
// In groupMethodsByFit(), after line 769 (after checking mismatches):

// SEMANTIC VALIDATION: Check if method's SEM levels overlap with user's selection
if (userFilterSelections.includes('sem_level')) {
  const methodSemLevels = method.attributes.sem_level || [];
  const userSemLevels = state.userSelections.sem_level || [];

  // If user selected SEM level(s), check for overlap
  if (userSemLevels.length > 0 && methodSemLevels.length > 0) {
    const hasOverlap = userSemLevels.some(level => methodSemLevels.includes(level));

    if (!hasOverlap) {
      // No SEM level overlap - skip this method entirely
      continue; // Don't add to any tier
    }
  }
}
```

**Impact:** Fixes remaining 5 violations.

---

## 📈 Expected Impact

### Before Implementation:
- ❌ 2 semantic violations in "Individual + Conflict + Low Resources" scenario
- ❌ Invalid suggestions appear in Stretch Options (67% match)
- ❌ Users see methods that can't achieve their measurement goals

### After Implementation:
- ✅ Zero semantic violations
- ✅ All suggestions are logically valid for user's context
- ✅ Maintains robust coverage (no zero-result combinations)

---

## 🧪 Testing Validation

After implementation, test these scenarios:

1. **Individual-only** → Should NOT show Administrative Data, Policy Tracking, Community Mapping
2. **Institutional-only** → Should show institutional methods appropriately
3. **Low tech + other filters** → Should NOT show digital methods
4. **High cultural + other filters** → Should NOT show Photovoice/Video

---

## 📝 Implementation Checklist

### Data Fixes:
- [ ] Photovoice: Remove "High" cultural restrictiveness
- [ ] Participatory Video: Remove "High" cultural restrictiveness
- [ ] Social Listening: Remove "Low" tech access

### Code Changes (app.js):
- [ ] Add `isSemanticMismatch()` function
- [ ] Apply semantic validation in `groupMethodsByFit()`
- [ ] Test all scenarios
- [ ] Update IMPLEMENTATION_SUMMARY.md

### Documentation:
- [ ] Update IMPLEMENTATION_SUMMARY with semantic rules
- [ ] Document the semantic validation logic
- [ ] Add testing scenarios for semantic validation

---

## 🤔 Decision Needed

**Would you like me to:**

**A)** Implement Phase 1 (data corrections) + Phase 2 (SEM level validation)?
**B)** Just do Phase 1 (data corrections) for now?
**C)** Review the code changes first before implementing?
**D)** Something else?

---

**Current Status:** Analysis complete, ready for implementation
